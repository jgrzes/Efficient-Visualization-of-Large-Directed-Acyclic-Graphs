#include <iostream>
#include <cmath>
#include <boost/program_options.hpp>

#include "data-structures/Graph.h"
#include "data-structures/Coloured_Graph.h"
#include "graph-preprocessing/assign_levels.h"
#include "graph-preprocessing/edge_and_vertex_processing_functions.h"
#include "algorithms/Graph_Colourer.h"
#include "algorithms/Layout_Drawer.h"
#include "utils/input_generation_for_qap.h"
#include "net/Layout_Service.hpp"

#define EPS_FOR_SIGNUM 1e-6
#define _signum(_x) ((std::abs(_x) < EPS_FOR_SIGNUM ? 0 : (_x < 0 ? -1 : 1)))

using namespace data_structures;
using namespace graph_preprocessing;
using namespace algorithms;
using namespace utils;
using namespace concurrency;
using namespace net;

namespace po = boost::program_options;

po::options_description createOptionsDescription() {
  po::options_description desc("Allowed options");
  desc.add_options()
    ("help", "produce help message")
    ("ls_ip_addr", po::value<std::string>(), "ip address to use for layout service socket")
    ("ls_port", po::value<int>(), "port to use for layout service socket")
    ("layout_tp_size", po::value<int>(), "size of thread pool responsible for creating layouts")
    ("ls_ch_thread_count", po::value<int>(), "number of threads layout service will use to process client requests on sockets");

  return desc;  
}


bool checkIfRequiredParamMissing(const po::variables_map& vm) {
  if (vm.count("ls_ip_addr") != 1) {
    std::cerr << "Layout service ip address not specified\n";
    return true;
  }
  
  if (vm.count("ls_port") != 1) {
    std::cerr << "Layout service port not specified\n";
    return true;
  }

  if (vm.count("layout_tp_size") != 1) {
    std::cerr << "Size of layout thread pool not specified\n";
    return true;
  }

  if (vm.count("ls_ch_thread_count") != 1) {
    std::cerr << "Number of client handling threads in layout service not specified\n";
    return true;
  }

  return false;
}


int main(int argc, char** argv) {
  auto desc = createOptionsDescription();
  po::variables_map vm;
  po::store(po::parse_command_line(argc, argv, desc), vm);
  po::notify(vm);

  if (vm.count("help")) {
    std::cout << desc << "\n";
    return 0;
  }

  if (checkIfRequiredParamMissing(vm)) return 1;

  std::string layoutServiceIpAddress;
  int layoutServicePort;
  size_t layoutThreadPoolSize;
  size_t layoutServiceClientHandlingThreadCount;

  layoutServiceIpAddress = vm["ls_ip_addr"].as<std::string>();
  layoutServicePort = vm["ls_port"].as<int>();
  layoutThreadPoolSize = vm["layout_tp_size"].as<int>();
  layoutServiceClientHandlingThreadCount = vm["ls_ch_thread_count"].as<int>();

  LayoutService layoutService(
    layoutServiceIpAddress, layoutServicePort, 
    layoutServiceClientHandlingThreadCount, 
    layoutThreadPoolSize, 
    createTimeval(1, 0), std::nullopt, false
  );
}

#undef EPS_FOR_SIGNUM
#undef _signum