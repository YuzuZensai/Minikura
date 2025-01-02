package cafe.kirameki.minikuraVelocity

import cafe.kirameki.minikuraVelocity.listeners.ServerConnectionHandler
import cafe.kirameki.minikuraVelocity.models.ReverseProxyServerData
import cafe.kirameki.minikuraVelocity.models.ServerData
import cafe.kirameki.minikuraVelocity.store.ServerDataStore
import cafe.kirameki.minikuraVelocity.utils.createWebSocketClient
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.google.inject.Inject
import com.velocitypowered.api.command.CommandManager
import com.velocitypowered.api.command.CommandMeta
import com.velocitypowered.api.command.SimpleCommand
import com.velocitypowered.api.event.Subscribe
import com.velocitypowered.api.event.proxy.ProxyInitializeEvent
import com.velocitypowered.api.plugin.Plugin
import com.velocitypowered.api.proxy.ProxyServer
import com.velocitypowered.api.proxy.server.RegisteredServer
import com.velocitypowered.api.proxy.server.ServerInfo
import net.kyori.adventure.text.Component
import okhttp3.OkHttpClient
import okhttp3.Request
import org.slf4j.Logger
import java.net.InetSocketAddress
import java.util.concurrent.Executors

@Plugin(id = "minikura-velocity", name = "MinikuraVelocity", version = "1.0")
class Main @Inject constructor(private val logger: Logger, private val server: ProxyServer) {
    private val servers: MutableMap<String, RegisteredServer> = HashMap()
    private val client = OkHttpClient()
    private val apiKey: String = System.getenv("MINIKURA_API_KEY") ?: ""
    private val apiUrl: String = System.getenv("MINIKURA_API_URL") ?: "http://localhost:3000"
    private val websocketUrl: String = System.getenv("MINIKURA_WEBSOCKET_URL") ?: "ws://localhost:3000/ws"

    @Subscribe
    fun onProxyInitialization(event: ProxyInitializeEvent?) {
        logger.info("Minikura-Velocity is initializing...")

        val client = createWebSocketClient(this, server, websocketUrl)
        client.connect()

        val commandManager: CommandManager = server.commandManager

        val serversCommandMeta: CommandMeta = commandManager.metaBuilder("servers")
            .plugin(this)
            .aliases("listservers", "serverlist")
            .build()

        val serversCommand = SimpleCommand { p ->
            val source = p.source()
            source.sendMessage(Component.text("Available servers:"))
            for ((name, server) in servers) {
                source.sendMessage(Component.text(" - $name (${server.serverInfo.address})"))
            }
        }

        commandManager.register(serversCommandMeta, serversCommand)

        val refreshCommandMeta: CommandMeta = commandManager.metaBuilder("refresh")
            .plugin(this)
            .build()

        val refreshCommand = SimpleCommand { p ->
            val source = p.source()
            source.sendMessage(Component.text("Refreshing server list..."))
            fetchServers()
            fetchReverseProxyServers()
            source.sendMessage(Component.text("Server list refreshed successfully!"))
        }

        commandManager.register(refreshCommandMeta, refreshCommand)

        val migrateCommandMeta: CommandMeta = commandManager.metaBuilder("migrate")
            .plugin(this)
            .build()

        val migrateCommand = SimpleCommand { p ->
            val source = p.source()
            val args = p.arguments()

            if (args.isEmpty()) {
                source.sendMessage(Component.text("Please specify a server to migrate players to."))
                return@SimpleCommand
            }

            val targetServerName = args[0]
            val targetServer = ServerDataStore.getReverseProxyServer(targetServerName)

            if (targetServer == null) {
                source.sendMessage(Component.text("Server '$targetServerName' not found."))
                return@SimpleCommand
            }

            migratePlayersToServer(targetServer)
            source.sendMessage(Component.text("Migrating players to server '$targetServerName'..."))
        }

        commandManager.register(migrateCommandMeta, migrateCommand)

        val connectionHandler = ServerConnectionHandler(servers, logger)
        server.eventManager.register(this, connectionHandler)

        fetchServers()
        fetchReverseProxyServers()

        logger.info("Minikura-Velocity has been initialized.")
    }

    private fun fetchReverseProxyServers() {
        val request = Request.Builder()
            .url("$apiUrl/reverse_proxy_servers")
            .header("Authorization", "Bearer $apiKey")
            .build()

        Executors.newSingleThreadExecutor().submit {
            try {
                val response = client.newCall(request).execute()
                if (response.isSuccessful) {
                    val responseBody = response.body?.string()
                    val fetchedServers = parseReverseProxyServersData(responseBody)

                    server.scheduler.buildTask(this, Runnable {
                        synchronized(ServerDataStore) {
                            ServerDataStore.clearReverseProxyServers()
                            ServerDataStore.addAllReverseProxyServers(fetchedServers)
                        }
                    }).schedule()
                } else {
                    logger.error("Failed to fetch reverse proxy servers: ${response.message}")
                }
            } catch (e: Exception) {
                logger.error("Error fetching reverse proxy servers: ${e.message}", e)
            }
        }
    }

    private fun fetchServers() {
        server.allServers.forEach { server.unregisterServer(it.serverInfo) }
        val request = Request.Builder()
            .url("$apiUrl/servers")
            .header("Authorization", "Bearer $apiKey")
            .build()

        Executors.newSingleThreadExecutor().submit {
            try {
                val response = client.newCall(request).execute()
                if (response.isSuccessful) {
                    val responseBody = response.body?.string()
                    val fetchedServers = parseServersData(responseBody)

                    server.scheduler.buildTask(this, Runnable {
                        synchronized(ServerDataStore) {
                            ServerDataStore.clearServers()
                            ServerDataStore.addAllServers(fetchedServers)
                        }
                        populateServers(fetchedServers)
                    }).schedule()
                } else {
                    logger.error("Failed to fetch servers: ${response.message}")
                }
            } catch (e: Exception) {
                logger.error("Error fetching servers: ${e.message}", e)
            }
        }
    }

    private fun parseReverseProxyServersData(responseBody: String?): List<ReverseProxyServerData> {
        if (responseBody.isNullOrEmpty()) return emptyList()

        val gson = Gson()
        val reverseProxyServerListType = object : TypeToken<List<ReverseProxyServerData>>() {}.type
        return gson.fromJson(responseBody, reverseProxyServerListType)
    }

    private fun parseServersData(responseBody: String?): List<ServerData> {
        if (responseBody.isNullOrEmpty()) return emptyList()

        val gson = Gson()

        val serverListType = object : TypeToken<List<ServerData>>() {}.type
        return gson.fromJson(responseBody, serverListType)
    }

    private fun populateServers(serversData: List<ServerData>) {
        servers.clear()

        for (data in serversData) {
            val serverInfo = ServerInfo(data.name, InetSocketAddress(data.address, data.port))
            val registeredServer = server.createRawRegisteredServer(serverInfo)
            servers[data.name] = registeredServer
            this.server.registerServer(registeredServer.serverInfo)
        }
    }

    private fun migratePlayersToServer(targetServer: ReverseProxyServerData) {
        val targetAddress = InetSocketAddress(targetServer.address, targetServer.port)

        server.allPlayers.forEach { player ->
            player.transferToHost(targetAddress)
        }
    }

}
