package cafe.kirameki.minikuraVelocity.models

import cafe.kirameki.minikuraVelocity.models.components.ReverseProxyServerType
import java.time.LocalDateTime

data class ReverseProxyServerData(
    val id: String,
    val type: ReverseProxyServerType,
    val description: String?,
    val external_address: String,
    val external_port: Int,
    val listen_port: Int = 25565,
    val memory: String = "512M",
    val api_key: String,
    val env_variables: List<CustomEnvironmentVariableData> = emptyList(),
    val created_at: String,
    val updated_at: String
)