import org.yaml.snakeyaml.DumperOptions
import org.yaml.snakeyaml.LoaderOptions
import org.yaml.snakeyaml.Yaml
import org.yaml.snakeyaml.constructor.Constructor
import java.io.File

const val PREFIX = "minikura-environment-config-patcher"

fun main() {
    val envVars = System.getenv()

    val patchConfigVars = envVars.filter { it.key.startsWith("PATCH_YAML_CONFIG_") }

    for ((key, value) in patchConfigVars) {
        println("[${getCurrentTime()} INFO] [$PREFIX]: Processing $key")

        val lines = splitWithEscapedPipe(value)
        if (lines.size < 2) {
            println("[${getCurrentTime()} INFO] [$PREFIX]: Skipping. Insufficient data.")
            continue
        }

        val yamlFilePath = lines[0].trim()
        val yamlFile = File(yamlFilePath)
        if (!yamlFile.exists()) {
            println("[${getCurrentTime()} INFO] [$PREFIX]: Skipping. File does not exist.")
            continue
        }

        val replacements = mutableMapOf<String, Any>()

        lines.drop(1).forEach { line ->
            val keyValue = line.split("=", limit = 2)
            if (keyValue.size == 2) {
                val key = keyValue[0].trim()
                val value = parseValue(keyValue[1].trim())

                val (baseKey, index, subKey) = parseKeyWithIndex(key)

                if (index != null) {
                    val arrayData = replacements.computeIfAbsent(baseKey) { mutableListOf<MutableMap<String, Any>>() } as MutableList<MutableMap<String, Any>>

                    while (arrayData.size <= index) {
                        arrayData.add(mutableMapOf())
                    }

                    val arrayItem = arrayData[index]
                    arrayItem[subKey] = value
                    println("[${getCurrentTime()} INFO] [$PREFIX]: Editing key: $baseKey[$index].$subKey")
                } else {
                    replacements[baseKey] = value
                    println("[${getCurrentTime()} INFO] [$PREFIX]: Editing key: $baseKey")
                }
            } else {
                println("[${getCurrentTime()} WARN] [$PREFIX]: Skipping malformed line.")
            }
        }

        try {
            val updatedYaml = updateYaml(yamlFile, replacements)
            yamlFile.writeText(updatedYaml)
            println("[${getCurrentTime()} INFO] [$PREFIX]: Successfully updated $yamlFilePath")
        } catch (e: Exception) {
            println("[${getCurrentTime()} ERROR] [$PREFIX]: Error processing $yamlFilePath. ${e.message}")
        }
    }

    println("[${getCurrentTime()} INFO] [$PREFIX]: Patch completed")
}

fun getCurrentTime(): String {
    val currentDate = java.time.LocalTime.now()
    return currentDate.toString().substring(0, 8)
}

fun splitWithEscapedPipe(value: String): List<String> {
    val regex = "(?<!\\\\)\\|".toRegex()
    return value.split(regex).map { it.replace("\\|", "|") }
}

fun parseValue(value: String): Any {
    return when {
        value.equals("true", ignoreCase = true) -> true
        value.equals("false", ignoreCase = true) -> false
        value.startsWith("\"") && value.endsWith("\"") -> value.substring(1, value.length - 1)
        value.startsWith("'") && value.endsWith("'") -> value.substring(1, value.length - 1)
        value.toIntOrNull() != null -> value.toInt()
        value.startsWith("[") && value.endsWith("]") -> parseArray(value)
        else -> value
    }
}

fun parseArray(value: String): List<Map<String, Any>> {
    val arrayContent = value.substring(1, value.length - 1).trim()
    return arrayContent.split(",").map { item ->
        val keyValue = item.split("=")
        if (keyValue.size == 2) {
            keyValue[0].trim() to parseValue(keyValue[1].trim())
        } else {
            keyValue[0].trim() to parseValue(keyValue[0].trim())
        }
    }.map { mapOf(it) }
}

fun parseKeyWithIndex(key: String): Triple<String, Int?, String> {
    val regex = """([^\[]+)(?:\[(\d+)\])?(\.[^\[]+)*""".toRegex()
    val matchResult = regex.matchEntire(key)
    return if (matchResult != null) {
        val (baseKey, indexStr, subKey) = matchResult.destructured
        val index = indexStr.toIntOrNull()
        val finalKey = subKey.trimStart('.')
        Triple(baseKey, index, finalKey)
    } else {
        Triple(key, null, "")
    }
}

fun updateYaml(file: File, replacements: Map<String, Any>): String {
    val loaderOptions = LoaderOptions()
    val yaml = Yaml(Constructor(loaderOptions))

    val options = DumperOptions().apply {
        defaultFlowStyle = DumperOptions.FlowStyle.BLOCK
        isPrettyFlow = true
    }
    val yamlDumper = Yaml(options)

    val yamlData = yaml.load<Map<String, Any>>(file.readText()).toMutableMap()

    for ((keyPath, value) in replacements) {
        applyReplacement(yamlData, keyPath.split("."), value)
    }

    return yamlDumper.dump(yamlData)
}

fun applyReplacement(data: MutableMap<String, Any>, keys: List<String>, value: Any) {
    val key = keys.first()
    if (keys.size == 1) {
        println("[${getCurrentTime()} INFO] [$PREFIX]: Editing key: $key")
        data[key] = value
    } else {
        val nestedData = data[key] as? MutableMap<String, Any>
            ?: mutableMapOf<String, Any>().also { data[key] = it }
        applyReplacement(nestedData, keys.drop(1), value)
    }
}
