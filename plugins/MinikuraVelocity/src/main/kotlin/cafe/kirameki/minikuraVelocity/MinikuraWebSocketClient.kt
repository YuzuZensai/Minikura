package cafe.kirameki.minikuraVelocity

import com.velocitypowered.api.proxy.ProxyServer
import org.java_websocket.client.WebSocketClient
import org.java_websocket.handshake.ServerHandshake
import java.net.URI
import java.time.Duration

class MinikuraWebSocketClient(private val plugin: Main, private val server: ProxyServer, serverUri: URI?) : WebSocketClient(serverUri) {
    override fun onOpen(handshakedata: ServerHandshake) {
        println("Connected to server")
    }

    override fun onMessage(message: String) {
        println("Received: $message")
    }

    override fun onError(ex: Exception) {
        ex.printStackTrace()
    }

    override fun onClose(code: Int, reason: String, remote: Boolean) {
        println("Disconnected from websocket, reconnecting...")
        server.scheduler.buildTask(plugin, Runnable { reconnect() }).delay(Duration.ofMillis(5000)).schedule()
    }
}