package cafe.kirameki.minikuraVelocity.utils

import cafe.kirameki.minikuraVelocity.Main
import cafe.kirameki.minikuraVelocity.MinikuraWebSocketClient
import com.velocitypowered.api.proxy.ProxyServer
import java.net.URI

fun createWebSocketClient(plugin: Main, server: ProxyServer, websocketUrl: String): MinikuraWebSocketClient {
    val uri = URI(websocketUrl)
    val client = MinikuraWebSocketClient(plugin, server, uri)
    return client
}
