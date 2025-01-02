package cafe.kirameki.minikuraVelocity.store

import cafe.kirameki.minikuraVelocity.models.ReverseProxyServerData
import cafe.kirameki.minikuraVelocity.models.ServerData
import com.velocitypowered.api.proxy.ProxyServer

object ServerDataStore {
    private val servers: MutableList<ServerData> = mutableListOf()
    private val reverseProxyServers: MutableList<ReverseProxyServerData> = mutableListOf()

    fun initialize(server: ProxyServer) {

    }

    fun addServer(serverData: ServerData) {
        servers.add(serverData)
    }

    fun addReverseProxyServer(reverseProxyServerData: ReverseProxyServerData) {
        reverseProxyServers.add(reverseProxyServerData)
    }

    fun addAllServers(serverData: List<ServerData>) {
        servers.addAll(serverData)
    }

    fun addAllReverseProxyServers(reverseProxyServerData: List<ReverseProxyServerData>) {
        reverseProxyServers.addAll(reverseProxyServerData)
    }

    fun getServer(name: String): ServerData? {
        return servers.find { it.name == name }
    }

    fun getReverseProxyServer(name: String): ReverseProxyServerData? {
        return reverseProxyServers.find { it.name == name }
    }

    fun getServers(): List<ServerData> {
        return servers
    }

    fun getReverseProxyServers(): List<ReverseProxyServerData> {
        return reverseProxyServers
    }

    fun clearServers() {
        servers.clear()
    }

    fun clearReverseProxyServers() {
        reverseProxyServers.clear()
    }
}
