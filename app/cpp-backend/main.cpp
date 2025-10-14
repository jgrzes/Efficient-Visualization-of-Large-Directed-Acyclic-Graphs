#include <iostream>

#include "data-structures/Graph.h"
#include "data-structures/Coloured_Graph.h"
#include "graph-preprocessing/assign_levels.h"
#include "graph-preprocessing/edge_and_vertex_processing_functions.h"
#include "algorithms/Graph_Colourer.h"
#include "utils/input_generation_for_qap.h"

using namespace data_structures;
using namespace graph_preprocessing;
using namespace algorithms;
using namespace utils;

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

// Graphs to test QAP F matrix generation

Graph G4(
  static_cast<uint32_t>(112), 
  {
    {1, 2, 3, 4, 6, 21}, // 0
    {5, 6, 7, 12, 13}, // 1
    {13, 14, 15}, // 2
    {21, 22, 23, 24}, // 3
    {24, 25, 109}, // 4
    {12, 8, 9, 10, 33}, // 5
    {11, 16}, // 6
    {10, 11}, // 7
    {33}, // 8
    {33, 34}, // 9
    {33, 34, 39}, // 10
    {34, 42}, // 11
    {31, 32, 35, 37}, // 12
    {16, 17, 42, 18}, // 13
    {17, 18, 19}, // 14
    {18, 19, 20, 26}, // 15
    {34, 41, 110}, // 16
    {}, // 17
    {42, 43}, // 18
    {43, 47, 44}, // 19
    {44, 49}, // 20
    {20, 26, 27}, // 21
    {28}, // 22
    {27, 28, 29}, // 23
    {29, 30, 57}, // 24
    {30}, // 25
    {44, 49, 50}, // 26
    {49, 50}, // 27
    {50, 51}, // 28
    {55, 56, 57}, // 29
    {56}, // 30
    {36}, // 31
    {35}, // 32
    {37, 40}, // 33
    {40, 41, 79}, // 34
    {61, 62, 63}, // 35
    {}, // 36
    {}, // 37
    {108}, // 38
    {41}, // 39
    {}, // 40
    {64, 65}, // 41
    {72, 46}, // 42
    {46, 47, 48}, // 43
    {48, 52}, // 44
    {79, 80}, // 45
    {}, // 46
    {}, // 47
    {86}, // 48
    {52}, // 49
    {86, 53}, // 50
    {53, 54}, // 51
    {90, 95}, // 52
    {99}, // 53
    {104}, // 54
    {58, 59, 60}, // 55
    {}, // 56
    {60, 38}, // 57
    {}, // 58
    {108, 99}, // 59
    {108}, // 60
    {66, 67}, // 61
    {68}, // 62
    {70, 68}, // 63
    {69}, // 64
    {70, 71, 72}, // 65
    {77}, // 66
    {77, 78}, // 67
    {111, 75}, // 68
    {}, // 69
    {111, 73}, // 70
    {73}, // 71
    {74, 85}, // 72
    {75}, // 73
    {}, // 74
    {76}, // 75
    {}, // 76
    {78, 76}, // 77
    {}, // 78
    {81}, // 79
    {81, 83, 84}, // 80
    {82}, // 81
    {85}, // 82
    {85, 89}, // 83
    {83, 88}, // 84
    {97}, // 85
    {84, 87, 88}, // 86
    {88}, // 87
    {89, 97, 96}, // 88
    {97}, // 89
    {87, 91, 93}, // 90
    {92, 93}, // 91
    {97, 96}, // 92
    {101}, // 93
    {93}, // 94
    {94, 100, 105}, // 95
    {97, 98}, // 96
    {}, // 97
    {}, // 98
    {100}, // 99
    {101, 102}, // 100
    {103}, // 101
    {103}, // 102
    {}, // 103
    {105, 106}, // 104
    {101, 107}, // 105
    {107}, // 106
    {102}, // 107
    {100}, // 108
    {29}, // 109
    {45}, // 110
    {75} // 111
  }
);

Graph G5(
  static_cast<uint32_t>(142), 
  {
    {1, 2, 3}, // 0
    {4, 5, 6, 9, 84}, // 1
    {84, 85, 86, 10, 6}, // 2
    {84, 85, 86, 129}, // 3
    {7, 8}, // 4
    {7, 8, 9}, // 5
    {10, 11, 127}, // 6
    {12, 13, 14, 15}, // 7
    {15}, // 8
    {16, 17}, // 9
    {17}, // 10
    {17, 94}, // 11
    {18}, // 12
    {18}, // 13
    {18, 19}, // 14
    {}, // 15
    {19, 20, 97}, // 16 
    {20, 94, 96}, // 17
    {21}, // 18
    {24}, // 19
    {22, 23}, // 20
    {25, 26, 32, 27, 28}, // 21
    {29, 30}, // 22
    {30, 36}, // 23
    {27, 28, 34}, // 24
    {31, 32}, // 25
    {32}, // 26
    {33}, // 27
    {33, 104}, // 28
    {34, 35}, // 29
    {35}, // 30
    {37, 38}, // 31
    {37, 38}, // 32
    {59, 67}, // 33
    {}, // 34
    {104, 118}, // 35
    {102, 139}, // 36
    {39}, // 37
    {39, 40}, // 38
    {43, 41, 42}, // 39
    {41, 42, 62}, // 40
    {44, 45}, // 41
    {73}, // 42
    {52, 53}, // 43
    {46, 47}, // 44
    {47, 76}, // 45
    {}, // 46
    {48, 49, 81}, // 47
    {50, 51}, // 48
    {51}, // 49
    {}, // 50 
    {}, // 51
    {}, // 52
    {54, 55}, // 53
    {56, 57}, // 54
    {56, 57, 48}, // 55
    {58, 50}, // 56
    {58}, // 57
    {}, // 58
    {60, 61}, // 59
    {62, 63, 64}, // 60 
    {65, 66}, // 61
    {73}, // 62
    {73, 78}, // 63
    {}, // 64
    {}, // 65
    {70, 71, 72}, // 66
    {68, 69}, // 67
    {}, // 68
    {106, 107, 66, 71, 75}, // 69
    {}, // 70
    {82}, // 71
    {109}, // 72
    {74, 75}, // 73
    {}, // 74
    {76, 77, 78}, // 75
    {81}, // 76
    {79, 80}, // 77
    {112}, // 78
    {}, // 79
    {}, // 80
    {}, // 81
    {83}, // 82
    {112}, // 83
    {11, 87, 88, 89}, // 84
    {88, 89}, // 85
    {89, 93, 128}, // 86
    {90, 91}, // 87
    {92}, // 88
    {93}, // 89
    {96, 94, 95}, // 90
    {130, 95}, // 91
    {}, // 92
    {95, 125, 126, 127}, // 93
    {97, 98}, // 94
    {99}, // 95
    {}, // 96
    {100}, // 97
    {101}, // 98
    {137, 138, 61}, // 99
    {102, 103}, // 100
    {}, // 101
    {}, // 102
    {104}, // 103
    {69, 105, 72, 82}, // 104
    {106, 107, 108}, // 105
    {109},  // 106
    {110}, // 107
    {116}, // 108
    {80, 136, 111}, // 109
    {136}, // 110
    {112, 113}, // 111
    {115}, // 112
    {115}, // 113
    {}, // 114
    {}, // 115
    {136, 117}, // 116
    {}, // 117
    {108}, // 118
    {121, 122}, // 119
    {122}, // 120
    {123}, // 121
    {123}, // 122
    {117}, // 123
    {120}, // 124
    {98, 139}, // 125
    {130}, // 126
    {131}, // 127
    {127, 129}, // 128
    {133}, // 129
    {138}, // 130
    {132}, // 131
    {141}, // 132
    {134, 135}, // 133
    {135}, // 134
    {124, 123}, // 135 
    {113, 114}, // 136
    {139}, // 137
    {139, 140, 141, 124}, // 138
    {}, // 139
    {118}, // 140
    {119, 120} // 141
  }
);

std::vector<std::pair<uint32_t, uint32_t>> predeterminedVertexColoursG5 = {
  {0, 0}, {1, 1}, {2, 2}, {3, 2}, 
  {4, 1}, {5, 1}, {6, 1}, {7, 1}, {8, 1}, 
  {9, 1}, {10, 1}, {11, 1}, {12, 1}, {13, 1}, 
  {14, 1}, {15, 1}, {16, 1}, {17, 1}, 
  {18, 1}, {19, 1}, {20, 1}, 
  {21, 3}, {22, 5}, {23, 5}, {24, 4}, 
  {25, 3}, {26, 3}, {27, 4}, {28, 4}, 
  {29, 5}, {29, 5}, {30, 5}, 
  {31, 3}, {32, 3}, {33, 4}, 
  {34, 5}, {35, 5}, {36, 5}, 
  {37, 6}, {38, 7}, {39, 6}, {40, 7}, 
  {41, 7}, {42, 7}, {43, 6}, {44, 7}, {45, 9}, {46, 7}, 
  {47, 9}, {48, 9}, {49, 9}, {50, 9}, {51, 9}, 
  {52, 8}, {53, 8}, {54, 8}, {55, 8}, {56, 8}, {57, 8}, 
  {58, 8}, {59, 10}, {60, 10}, {61, 10}, {62, 12}, {63, 12},
  {64, 10}, {65, 13}, {66, 13}, {67, 11}, {68, 11}, {69, 11}, 
  {70, 13}, {71, 13}, {72, 13}, {73, 12}, {74, 12}, {75, 12}, {76, 12}, 
  {77, 12}, {78, 12}, {79, 12}, {80, 12}, {81, 12}, 
  {82, 13}, {83, 13}, {84, 2}, {85, 2}, {86, 2}, {87, 2}, 
  {88, 2}, {89, 2}, {90, 14}, {91, 14}, {92, 2}, {93, 15}, 
  {94, 14}, {95, 14}, {96, 14}, {97, 14}, {98, 14}, 
  {99, 16}, {100, 14}, {101, 14}, {102, 14}, 
  {103, 14}, {104, 14}, {105, 17}, {106, 17}, {107, 17}, 
  {108, 17}, {109, 19}, {110, 20}, {111, 19}, 
  {112, 19}, {113, 20}, {114, 20}, {115, 20}, {116, 20}, {117, 20}, 
  {118, 16}, {119, 18}, {120, 18}, {121, 18}, {123, 18},
  {124, 16}, {125, 15}, {126, 15}, {127, 15}, {128, 15}, 
  {128, 15}, {130, 15}, {131, 15}, {132, 15}, {133, 15}, 
  {134, 15}, {135, 15}, {136, 20}, {137, 16}, {138, 16}, 
  {139, 16}, {140, 16}, {141, 16}
};

std::vector<std::pair<uint32_t, uint32_t>> predeterminedVertexColoursG4 = {
  {0, 0}, {1, 1}, {2, 2}, {3, 3}, {4, 4}, 
  {5, 1}, {6, 1}, {7, 1}, {8, 1}, {9, 1}, 
  {10, 1}, {11, 1}, {12, 1}, {13, 2}, {14, 2}, 
  {15, 2}, {16, 2}, {17, 2}, {18, 2}, {19, 2},
  {20, 2}, {21, 3}, {22, 3}, {23, 3}, {24, 4}, 
  {25, 4}, {26, 3}, {27, 3}, {28, 3}, {29, 4}, 
  {30, 4}, {31, 1}, {32, 1}, {33, 1}, {34, 1}, 
  {35, 5}, {36, 1}, {37, 1}, {38, 4}, {39, 1}, 
  {40, 1}, {41, 6}, {42, 2}, {43, 2}, {44, 2}, 
  {45, 7}, {46, 2}, {47, 2}, {48, 8}, {49, 3}, 
  {50, 3}, {51, 3}, {52, 9}, {53, 10}, {54, 11}, 
  {55, 4}, {56, 4}, {57, 4}, {58, 4}, {59, 4}, 
  {60, 4}, {61, 5}, {62, 5}, 
  {63, 5}, {64, 5}, {65, 6}, {66, 5}, 
  {67, 5}, {68, 5}, {69, 5}, {70, 6}, {71, 6}, 
  {72, 6}, {73, 6}, {74, 6}, {75, 6}, {76, 6}, 
  {77, 5}, {78, 5}, {79, 7}, {80, 7}, {81, 7}, 
  {82, 7}, {83, 7}, {84, 7}, {85, 7}, {86, 8}, 
  {87, 8}, {88, 8}, {89, 8}, {90, 9}, {91, 9}, 
  {92, 9}, {93, 9}, {94, 9}, {95, 9}, {96, 9}, 
  {97, 9}, {98, 9}, {99, 10}, {100, 10}, 
  {101, 10}, {102, 10}, {103, 10}, {104, 11}, 
  {105, 11}, {106, 11}, {107, 11}, {108, 4}, 
  {109, 4}, {110, 2}, {111, 5}
};

void readMaxColour(const GraphColourer::ColourHierarchyNode& node, uint32_t& maxColour) {
  maxColour = std::max(maxColour, node.colour);
  for (const auto& childNode : node.children) {
    readMaxColour(childNode, maxColour);
  }  
}


void printColourHierarchy(const GraphColourer::ColourHierarchyNode& node, uint32_t depth = 0) {
  for (size_t j=0; j<depth; ++j) std::cout << "-";
  std::cout << " " << node.colour << "\n";
  for (const auto& childColourNode : node.children) {
    printColourHierarchy(childColourNode, depth+1);
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
  // assignLevelsInGraph(G3);
  // std::cout << "G3 after level assignment: \n";
  // std::cout << G3 << "\n\n";
  // auto graphColourerAlg = GraphColourer(
  //   GraphColourer::AlgorithmParams(
  //     [](uint32_t level, uint32_t cumDisputableEdgesAtLevel, uint32_t cumVerticesAtLevel) -> bool {
  //       return level >= 2;
  //     },
  //     [](uint32_t level, uint32_t commonVerticesCount) -> bool {
  //       return commonVerticesCount >= 3;
  //     }    
  //   )
  // );
  // auto&& [colouredGraph, colourHierarchy] = graphColourerAlg.assignColoursToGraph(G3, true, 3);

  // uint32_t maxColour = 0;
  // readMaxColour(colourHierarchy, maxColour);
  // std::vector<std::vector<uint32_t>> verticesByColour(maxColour+1, std::vector<uint32_t>{});

  // size_t n = colouredGraph.getVertexCount();
  // for (size_t uIndex=0; uIndex<n; ++uIndex) {
  //   verticesByColour[colouredGraph.getVertexColour(uIndex)].emplace_back(uIndex);
  // }

  // std::cout << "Vertex colours: \n";
  // for (size_t i=0; i<maxColour+1; ++i) {
  //   std::cout << " {" << i << ": {";
  //   for (size_t j=0; j<verticesByColour[i].size(); ++j) {
  //     const auto uIndex = verticesByColour[i][j];
  //     std::cout << uIndex << (j == verticesByColour[i].size()-1 ? "" : ", ");
  //   }
  //   std::cout << "}}\n";
  // }

  // std::cout << "Colour hierarchy: \n";
  // printColourHierarchy(colourHierarchy, 1);

  // ColouredGraph CG4 = ColouredGraph(G4, GraphInterface::GraphImplCopyingMode::SHALLOW_COPY);
  // for (const auto [vIndex, vColour] : predeterminedVertexColoursG3) {
  //   CG4.setVertexColour(vIndex, vColour);
  // }

  using CHN = GraphColourer::ColourHierarchyNode;
  // CHN colour0(0, nullptr);
  // colour0.addChild(1);
  // colour0.addChild(2);
  // colour0.addChild(3);
  // colour0.addChild(4);
  // colour0.children[0].addChild(5);
  // colour0.children[0].addChild(6);
  // colour0.children[1].addChild(7);
  // colour0.children[1].addChild(8);
  // colour0.children[2].addChild(9);
  // colour0.children[2].addChild(10);
  // colour0.children[2].addChild(11);

  // std::vector<std::reference_wrapper<CHN>> colourNodes = {
  //   std::ref(colour0), // 0
  //   std::ref(colour0.children[0]), // 1 
  //   std::ref(colour0.children[1]), // 2
  //   std::ref(colour0.children[2]), // 3
  //   std::ref(colour0.children[3]), // 4
  //   std::ref(colour0.children[0].children[0]), // 5
  //   std::ref(colour0.children[0].children[1]), // 6 
  //   std::ref(colour0.children[1].children[0]), // 7
  //   std::ref(colour0.children[1].children[1]), // 8
  //   std::ref(colour0.children[2].children[0]), // 9 
  //   std::ref(colour0.children[2].children[1]), // 10 
  //   std::ref(colour0.children[2].children[2]), // 11 
  // };

  // for (uint32_t uIndex=0; uIndex<CG4.getVertexCount(); ++uIndex) {
  //   colourNodes[CG4.getVertexColour(uIndex)].get().verticesOfColour.emplace_back(uIndex);
  // }

  // // for (std::reference_wrapper<CHN>& colourNode : colourNodes) {
  // //   if (colourNode.get().parent != nullptr) {
  // //     colourNodes[colourNode.get().parent->colour].get().children.emplace_back(colourNode);
  // //   }
  // // }

  // data_structures::SparseMatrix<std::pair<uint64_t, uint64_t>> FG4 = utils::createFMatrixForColoursQAP(
  //   colour0, CG4
  // );

  // std::vector<std::pair<uint32_t, uint32_t>> interestingPairs = {
  //   {1, 2}, {1, 3}, {1, 4}, {2, 3}, {2, 4}, {3, 4}, 
  //   {5, 6}, {5, 7}, {6, 7}, {7, 8}, {7, 9}, {8, 9}, 
  //   {9, 10}, {10, 11}, {9, 11}, 
  //   {1, 7}, {2, 6}, {2, 9}, {3, 8}, 
  //   {4, 11}
  // };

  // for (const auto [c, cPrim] : interestingPairs) {
  //   const auto& pc = FG4.at(c, cPrim);
  //   std::cout << "(" << c << ", " << cPrim << "): (" << pc.first << ", " << pc.second << ")\n";
  // }

  ColouredGraph CG5 = ColouredGraph(G5, GraphInterface::GraphImplCopyingMode::SHALLOW_COPY);
  for (const auto [vIndex, vColour] : predeterminedVertexColoursG5) {
    CG5.setVertexColour(vIndex, vColour);
  }

  CHN colour0(0);
  colour0.addChild(1);
  colour0.addChild(2);
  auto& colour1 = colour0.children[0];
  auto& colour2 = colour0.children[1];
  colour1.addChild(3);
  colour1.addChild(4);
  colour1.addChild(5);
  auto& colour3 = colour1.children[0];
  auto& colour4 = colour1.children[1];
  auto& colour5 = colour1.children[2];
  colour3.addChild(6);
  colour3.addChild(7);
  auto& colour6 = colour3.children[0];
  auto& colour7 = colour3.children[1];
  colour6.addChild(8);
  colour7.addChild(9);
  colour4.addChild(10);
  colour4.addChild(11);
  auto& colour10 = colour4.children[0];
  colour10.addChild(12);
  colour10.addChild(13);
  colour2.addChild(14);
  colour2.addChild(15);
  auto& colour14 = colour2.children[0];
  colour14.addChild(16);
  colour14.addChild(17);
  auto& colour16 = colour14.children[0];
  colour16.addChild(18);
  auto& colour17 = colour14.children[1];
  colour17.addChild(19);
  colour17.addChild(20);

  std::vector<std::reference_wrapper<CHN>> colourNodes = {
    std::ref(colour0),
    std::ref(colour1),
    std::ref(colour2),
    std::ref(colour3),
    std::ref(colour4),
    std::ref(colour5),
    std::ref(colour6),
    std::ref(colour7),
    std::ref(colour6.children[0]),
    std::ref(colour7.children[0]),
    std::ref(colour10),
    std::ref(colour4.children[1]),
    std::ref(colour10.children[0]),
    std::ref(colour10.children[1]),
    std::ref(colour14),
    std::ref(colour2.children[1]),
    std::ref(colour16),
    std::ref(colour17),
    std::ref(colour16.children[0]),
    std::ref(colour17.children[0]),
    std::ref(colour17.children[1])
  };

  for (uint32_t uIndex=0; uIndex<CG5.getVertexCount(); ++uIndex) {
    colourNodes[CG5.getVertexColour(uIndex)].get().verticesOfColour.emplace_back(uIndex);
  }

  // for (std::reference_wrapper<CHN>& colourNode : colourNodes) {
  //   if (colourNode.get().parent != nullptr) {
  //     colourNodes[colourNode.get().parent->colour].get().children.emplace_back(colourNode);
  //   }
  // }

  const auto&& FG5 = utils::createFMatricesForColoursQAP(
    colour0, CG5
  );

  // std::vector<std::pair<uint32_t, uint32_t>> interestingPairs = {
    
  // };

  // for (const auto [c, cPrim] : interestingPairs) {
  //   const auto& pc = FG5.at(c, cPrim);
  //   std::cout << "(" << c << ", " << cPrim << "): (" << pc.first << ", " << pc.second << ")\n";
  // }

  return 0;

}