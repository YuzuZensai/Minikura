package cafe.kirameki.minikuraVelocity.listeners

import cafe.kirameki.minikuraVelocity.store.ServerDataStore
import com.velocitypowered.api.event.Subscribe
import com.velocitypowered.api.event.player.PlayerChooseInitialServerEvent
import com.velocitypowered.api.proxy.server.RegisteredServer
import org.slf4j.Logger

class ServerConnectionHandler(
    private val servers: Map<String, RegisteredServer>,
    private val logger: Logger
) {
    @Subscribe
    fun onPlayerChooseInitialServer(event: PlayerChooseInitialServerEvent) {
        val player = event.player
        val currentServer = event.initialServer;

        val sortedServers = ServerDataStore.getServers()
            .filter { it.join_priority != null }
            .sortedBy { it.join_priority }
            .mapNotNull { servers[it.name] }

        System.out.println("Sorted servers: ${sortedServers.map { it.serverInfo.name }}")

        for (server in sortedServers) {
            if (server != currentServer) {
                logger.info("Attempting to connect ${player.username} to server ${server.serverInfo.name}")
                event.setInitialServer(server)
                return
            }
        }

        logger.warn("No available servers with valid join_priority for ${player.username}")
    }
}