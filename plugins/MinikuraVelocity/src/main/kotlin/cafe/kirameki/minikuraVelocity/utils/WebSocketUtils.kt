package cafe.kirameki.minikuraVelocity.utils

import cafe.kirameki.minikuraVelocity.Main
import cafe.kirameki.minikuraVelocity.MinikuraWebSocketClient
import com.velocitypowered.api.proxy.ProxyServer
import org.slf4j.Logger
import java.net.URI

fun createWebSocketClient(plugin: Main, logger: Logger, server: ProxyServer, websocketUrl: String): MinikuraWebSocketClient {
    val uri = URI(websocketUrl)
    val client = MinikuraWebSocketClient(plugin, logger, server, uri)
    return client
}
