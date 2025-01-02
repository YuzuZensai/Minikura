# ⛏️ Minikura ミニクラ  
**Manage Minecraft servers effortlessly for Kubernetes**

Minikura is designed to simplify the management and deployment of Minecraft servers within Kubernetes clusters. From SMP server to network of minigames, or mix of those.

🚧 **Note:** Minikura is in heavy development and very incomplete. Its scope, features, and roadmap are subject to change as the project evolves.

---

## 🚀 Planned Feature Set

### Core Features
- [ ] **Server Management**  
   - [ ] Manage **stateless** servers (e.g., minigames)
   - [ ] Manage **stateful** servers (e.g., SMP)
   - [x] Manage **Velocity reverse proxy** servers
   - [ ] Dynamic scaling for stateless server

- [ ] **Integration with Velocity**
   - [x] Dynamically manage backends
   - [x] **Proxy Transfers** - Seamlessly transfer players between proxies
   - [x] [ValioBungee](https://www.spigotmc.org/resources/valiobungee.87700/) (RedisBungee) integration
   - [ ] **Load Balancing**

### User Experience
- [ ] **Frontend**  
   - Web interface for managing servers and configurations.  

### Kubernetes
- [ ] **Managed deployment in Kubernetes Clusters**

---

## 📌 Additional Features In Consideration  

### Advanced Server Management
- [ ] Automatic backups and restore
- [ ] Scheduled server start/stop to save resources 

### Plugins
- [ ] Management for server jar versions, plugins, and mods

### API & Extensibility
- [ ] REST/GraphQL API for programmatic control
