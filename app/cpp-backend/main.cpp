#include <iostream>

#include "data-structures/Graph.h"
#include "data-structures/Coloured_Graph.h"
#include "graph-preprocessing/assign_levels.h"
#include "graph-preprocessing/edge_and_vertex_processing_functions.h"
#include "algorithms/Graph_Colourer.h"

using namespace data_structures;
using namespace graph_preprocessing;
using namespace algorithms;

// Graphs to find levels for:

Graph G1(
  static_cast<uint32_t>(32), 
  {
    {1, 3, 5, 6, 21, 15, 20, 23}, // 0
    {5, 6, 14, 2},  // 1
    {14, 15, 19}, // 2
    {2, 17, 4, 18}, // 3
    {17}, // 4
    {7, 11}, // 5
    {12, 13, 25}, // 6
    {8, 9, 10}, // 7
    {}, // 8
    {}, // 9
    {}, // 10
    {10}, // 11
    {13, 10}, // 12
    {}, // 13
    {13, 16}, // 14
    {16, 17}, // 15
    {}, // 16
    {}, // 17
    {19}, // 18
    {}, // 19
    {21, 22}, // 20
    {18, 26}, // 21
    {19, 24}, // 22
    {30, 29, 31}, // 23
    {26}, // 24
    {}, // 25
    {}, // 26
    {}, // 27
    {}, // 28
    {27, 28}, // 29
    {26, 29}, // 30
    {} // 31
  }
);

// Graphs to prune paths from:

Graph G2(
  static_cast<uint32_t>(30),
  {
    {1, 2, 3, 4, 16, 12}, // 0
    {5, 12, 10}, // 1
    {15, 16, 18}, // 2
    {21}, // 3
    {24, 22, 23}, // 4
    {6, 7, 10}, // 5
    {8}, // 6
    {10, 11}, // 7
    {9}, // 8
    {}, // 9
    {}, // 10
    {}, // 11
    {13}, // 12
    {14}, // 13
    {}, // 14
    {17, 18}, // 15
    {29}, // 16
    {}, // 17
    {19, 20, 29}, // 18
    {}, // 19
    {}, // 20
    {}, // 21
    {}, // 22
    {26}, // 23
    {25}, // 24
    {}, // 25
    {27}, // 26
    {28}, // 27
    {}, // 28
    {} // 29
  }
);

// Graphs to test non-recursive colour assignment for:

Graph G3(
    static_cast<uint32_t>(171), 
    {
      // {1, 2, 3, 4}, // 0
      {1, 2, 3, 4, 12, 166}, // 0 // true
      {11, 12, 14, 168}, // 1
      {166, 54, 82}, // 2
      {165, 166, 88}, // 3
      {5, 6, 9, 164}, // 4
      {8}, // 5
      // {7, 161}, // 6
      {7, 161, 114}, // 6 // true
      {133, 139, 138}, // 7 
      {89, 115, 128}, // 8
      {8, 10, 162, 163}, // 9
      {140, 141}, // 10 
      {27}, // 11 
      {13}, // 12 
      {24}, // 13 
      {15}, // 14
      {16, 21, 25}, // 15
      {21, 20, 17}, // 16 
      {18}, // 17
      {}, // 18
      {}, // 19 
      {19}, // 20 
      {22}, // 21 
      {35, 36}, // 22 
      {48}, // 23
      {26, 27, 28, 30}, // 24 
      {26, 27, 28, 30}, // 25 
      {31, 32, 23}, // 26
      {31, 32, 23}, // 27
      {31, 32, 23}, // 28
      {30}, // 29 
      {49, 50}, // 30
      {35, 34}, // 31 
      {33, 47}, // 32
      {45, 46}, // 33 
      {45, 170}, // 34
      {36}, // 35 
      {37, 38, 170, 43}, // 36
      {39, 40}, // 37 
      {39}, // 38
      {40, 41, 42}, // 39 
      {}, // 40 
      {}, // 41 
      {}, // 42 
      {66, 67, 68}, // 43 
      {43, 64}, // 44 
      {44}, // 45 
      {63}, // 46
      {45, 46}, // 47 
      {46, 62}, // 48 
      {51}, // 49 
      {51}, // 50 
      {61, 60}, // 51 
      {51, 60}, // 52 
      {57, 58, 92}, // 53 
      {55}, // 54 
      {29, 53, 56}, // 55 
      {57, 58}, // 56 
      {52}, // 57 
      {59, 92, 93}, // 58 
      {94, 167}, // 59 
      {72, 73, 74}, // 60 
      {72, 73, 74, 76}, // 61 
      {72, 73, 74, 76}, // 62 
      {}, // 63 
      {65}, // 64 
      {}, // 65 
      {}, // 66 
      {}, // 67 
      {}, // 68
      {}, // 69 
      {65, 69}, // 70 
      {}, // 71
      {64, 70, 71}, // 72 
      {70, 71, 79}, // 73 
      {70, 71, 79}, // 74 
      {73, 74, 76}, // 75 
      {77}, // 76 
      {}, // 77 
      {}, // 78 
      {78, 80, 81}, // 79 
      {}, // 80 
      {}, // 81
      {85, 83, 86, 87}, // 82 
      {84}, // 83
      {91}, // 84
      {84}, // 85
      {84}, // 86 
      {89, 115, 128}, // 87 
      {89, 115, 128}, // 88 
      {90, 117}, // 89
      {94, 118}, // 90 
      {92}, // 91 
      {94, 95}, // 92 
      {167, 94}, // 93 
      {75}, // 94 
      {96}, // 95 
      {97, 98}, // 96 
      {77}, // 97 
      {77, 100}, // 98
      {}, // 99 
      {99, 103, 104}, // 100
      {100}, // 101 
      {}, // 102
      {}, // 103 
      {}, // 104 
      {}, // 105
      {105}, // 106 
      {105}, // 107
      {106, 107, 110, 112}, // 108
      {}, // 109 
      {111}, // 110 
      {}, // 111
      {111, 113}, // 112 
      {}, // 113
      {89, 115, 128}, // 114 
      {116, 130}, // 115
      {119, 126}, // 116 
      {119}, // 117
      {120, 121, 122}, // 118
      {122}, // 119
      {123, 125}, // 120 
      {124, 125}, // 121 
      {124}, // 122 
      {101}, // 123 
      {102}, // 124 
      {108}, // 125
      {125, 108}, // 126 
      {126}, // 127
      {129, 134}, // 128 
      {131, 132, 133}, // 129 
      {127}, // 130 
      {126, 135}, // 131 
      {108, 135}, // 132 
      {135}, // 133 
      {133}, // 134 
      {136, 109, 108}, // 135 
      {109}, // 136 
      {112}, // 137 
      {112, 137}, // 138 
      {135, 138}, // 139 
      {139, 142, 147}, // 140
      {142, 147, 148, 139}, // 141 
      {143}, // 142 
      {144}, // 143 
      {112, 150}, // 144 
      {156, 157, 158}, // 145 
      {144}, // 146 
      {143, 146}, // 147 
      {146, 149}, // 148 
      {144, 145}, // 149 
      {151, 153}, // 150
      {152, 154}, // 151 
      {}, // 152
      {155}, // 153 
      {}, // 154 
      {}, // 155 
      {159}, // 156 
      {}, // 157 
      {159}, // 158 
      {160}, // 159 
      {}, // 160
      {}, // 161
      {}, // 162
      {}, // 163 
      {163}, // 164 
      {}, // 165 
      {86}, // 166 
      {}, // 167 
      {169}, // 168 
      {}, // 169 
      {43}, // 170  
    }
);


uint32_t readMaxColour(const GraphColourer::ColourHierarchyNode& node, uint32_t& maxColour) {
  maxColour = std::max(maxColour, node.colour);
  for (const auto& childNode : node.children) {
    readMaxColour(childNode, maxColour);
  }  
}


int main(int argc, char** argv) {
  // Testing if level assignment works
  // assignLevelsInGraph(G1);
  // std::cout << "G1 after level assignment: \n";
  // std::cout << G1 << "\n\n";
  // // Tests done: level assignment works

  // // Testing if path pruning works
  // auto G2AfterPathPruning = removeDanglingPathsFromGraph(
  //   G2, PartiallyDisabledGraph::GraphStoringPolicy::RAW_POINTER_NON_OWNING
  // );
  // std::cout << "G2 after path pruning: \n";
  // std::cout << G2AfterPathPruning << "\n\n";
  // Tests done: path pruning works

  // Testing if non-recursive graph colouring works
  assignLevelsInGraph(G3);
  std::cout << "G3 after level assignment: \n";
  std::cout << G3 << "\n\n";
  auto graphColourerAlg = GraphColourer(
    GraphColourer::AlgorithmParams(
      [](uint32_t level, uint32_t cumDisputableEdgesAtLevel, uint32_t cumVerticesAtLevel) -> bool {
        return level >= 2;
      },
      [](uint32_t level, uint32_t commonVerticesCount) -> bool {
        return commonVerticesCount >= 3;
      }    
    )
  );
  auto&& [colouredGraph, colourHierarchy] = graphColourerAlg.assignColoursToGraph(G3);

  uint32_t maxColour = 0;
  readMaxColour(colourHierarchy, maxColour);
  std::vector<std::vector<uint32_t>> verticesByColour(maxColour+1, std::vector<uint32_t>{});

  size_t n = colouredGraph.getVertexCount();
  for (size_t uIndex=0; uIndex<n; ++uIndex) {
    verticesByColour[colouredGraph.getVertexColour(uIndex)].emplace_back(uIndex);
  }

  std::cout << "Vertex colours: \n";
  for (size_t i=0; i<maxColour+1; ++i) {
    std::cout << " {" << i << ": {";
    for (size_t j=0; j<verticesByColour[i].size(); ++j) {
      const auto uIndex = verticesByColour[i][j];
      std::cout << uIndex << (j == verticesByColour[i].size()-1 ? "" : ", ");
    }
    std::cout << "}}\n";
  }

  return 0;

}