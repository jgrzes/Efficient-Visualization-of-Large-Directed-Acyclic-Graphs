# Efficient Visualization of Large Directed Acyclic Graphs

<p align="center">
  <img src="docs/screenshots/hero_light.png" width="800" />
</p>

A web-based application for efficient visualization, analysis, and interactive exploration of large **Directed Acyclic Graphs (DAGs)**.  
The system is designed to handle graphs with **thousands of nodes and edges**, focusing on **scalability, clarity, and performance** ⚡

---

## 🎬 Demo

<p align="center">
  <video src="docs/videos/demo.mp4" width="800" controls autoplay loop muted></video>
</p>



## 📌 Use Cases

- 🔗 Visualization of dependency graphs  
- 🧩 Analysis of workflow DAGs  
- 🎓 Research and academic projects   

---

## Features

## ✨ Features

- 📈 Scalable visualization of large DAGs (**10k+ nodes**)
- 🖱 Interactive graph exploration  
  - 🔍 zooming and panning  
  - 🔎 node and edge inspection  
- 🧠 Backend graph analysis  
  - hierarchy and level computation  
  - layout preprocessing  
- ⚡ High-performance layout computation  
  - offloaded to a **C++ gRPC service**  
- 🌐 Modern web frontend  
  - responsive user interface  
  - real-time communication with backend  
- 🗄 MongoDB-based storage  
  - persistent graph data  
  - reusable layouts  

---

## 🏗 Architecture Overview

The application follows a **multi-service architecture** optimized for performance and separation of concerns.  
Graph visualization is handled by a **web frontend**, while heavy layout computations are delegated to a dedicated **C++ service via gRPC**.  
A **Python backend** coordinates data flow, graph analysis, and communication between components.

---

## 🧰 Tech Stack

### 🎨 Frontend
- Vite
- JavaScript / TypeScript

### 🧠 Backend
- Python 3
- Flask
- gRPC
- graph-tool
- MongoDB (PyMongo)

### ⚙️ Layout Engine
- C++
- gRPC


---

## ⚙️ Getting Started

### 📦 Prerequisites
- Docker
- Docker Compose

---

### ▶️ Run the application

```bash
git clone https://github.com/Grzeslaw115/Efficient-Visualization-of-Large-Directed-Acyclic-Graphs
cd Efficient-Visualization-of-Large-Directed-Acyclic-Graphs
docker compose build && docker compose up
```

### 🌍 After startup

- 🎨 Frontend: http://localhost:30306  
- 🧠 Python Backend API: http://localhost:30301  


## 🧑‍💻 Authors

- **[Jakub Grześ](https://github.com/Grzeslaw115)**
- **[Jan Masternak](https://github.com/janmast1o)**
- **[Tomasz Smyda](https://github.com/tsmyda)**


