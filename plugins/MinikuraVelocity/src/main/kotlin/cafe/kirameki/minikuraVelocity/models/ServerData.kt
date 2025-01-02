package cafe.kirameki.minikuraVelocity.models

data class ServerData(
    val id: String,
    val name: String,
    val description: String?,
    val address: String,
    val port: Int,
    val type: String,
    val join_priority: Int?,
    val api_key: String,
    val created_at: String,
    val updated_at: String
)