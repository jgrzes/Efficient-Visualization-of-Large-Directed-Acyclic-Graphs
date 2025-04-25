from graph_tool.all import Graph, graph_draw
import numpy
import pandas
import matplotlib.pyplot as plt

g = Graph(directed=True)

v1 = g.add_vertex()
v2 = g.add_vertex()
v3 = g.add_vertex()

g.add_edge(v1, v2)
g.add_edge(v2, v3)
g.add_edge(v3, v1)

print(f"Liczba wierzchołków: {g.num_vertices()}")
print(f"Liczba krawędzi: {g.num_edges()}")

graph_draw(g, output_size=(300, 300), output="/app/graph.svg")
print("Wizualizacja zapisana jako graph.svg")