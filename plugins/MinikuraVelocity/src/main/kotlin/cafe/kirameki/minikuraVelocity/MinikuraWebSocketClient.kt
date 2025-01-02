package cafe.kirameki.minikuraVelocity

import com.velocitypowered.api.proxy.ProxyServer
import org.java_websocket.client.WebSocketClient
import org.java_websocket.handshake.ServerHandshake
import org.slf4j.Logger
import java.net.URI
import java.time.Duration

class MinikuraWebSocketClient(private val plugin: Main, private val logger: Logger, private val server: ProxyServer, serverUri: URI?) : WebSocketClient(serverUri) {
    override fun onOpen(handshakedata: ServerHandshake) {
        logger.info("Connected to websocket")
    }

    override fun onMessage(message: String) {
        logger.debug("Received: $message")
    }

    override fun onError(ex: Exception) {
        ex.printStackTrace()
    }

    override fun onClose(code: Int, reason: String, remote: Boolean) {
        logger.info("Connection closed, attempting to reconnect...")
        server.scheduler.buildTask(plugin, Runnable { reconnect() }).delay(Duration.ofMillis(5000)).schedule()
    }
}