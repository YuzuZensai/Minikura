package cafe.kirameki.minikuraVelocity.models

import java.time.LocalDateTime

data class CustomEnvironmentVariableData(
    val id: String,
    val key: String,
    val value: String,
    val created_at: String,
    val updated_at: String,
    val server_id: String? = null,
    val server: ServerData? = null,
    val reverse_proxy_id: String? = null,
    val reverse_proxy_server: ReverseProxyServerData? = null
) 