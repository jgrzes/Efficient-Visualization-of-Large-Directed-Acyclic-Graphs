#include <iostream>
#include <cmath>
#include <boost/program_options.hpp>
#include <signal.h>
#include <thread>
#include <grpcpp/server_builder.h>

#include "data-structures/Graph.h"
#include "data-structures/Coloured_Graph.h"
#include "graph-preprocessing/assign_levels.h"
#include "graph-preprocessing/edge_and_vertex_processing_functions.h"
#include "algorithms/Graph_Colourer.h"
#include "algorithms/Layout_Drawer.h"
#include "utils/input_generation_for_qap.h"
#include "net/Grpc_Layout_Service.hpp"
#include "algorithms/algorithm_params_creation.hpp"

#define EPS_FOR_SIGNUM 1e-6
#define _signum(_x) ((std::abs(_x) < EPS_FOR_SIGNUM ? 0 : (_x < 0 ? -1 : 1)))

using namespace data_structures;
using namespace graph_preprocessing;
using namespace algorithms;
using namespace utils;
using namespace net;

namespace po = boost::program_options;

grpc::Server* grpcLayoutServicePtr;
bool* mainProcessRunningPtr;

po::options_description createOptionsDescription() {
  po::options_description desc("Allowed options");
  desc.add_options()
    ("help", "produce help message")
    ("ls_ip_addr", po::value<std::string>(), "ip address to use for layout service socket")
    ("ls_port", po::value<int>(), "port to use for layout service socket")
    ("ls_min_tp_size", po::value<int>(), "min size of grpc layout service thread pool")
    ("ls_max_tp_size", po::value<int>(), "max size of grpc layout service thread pool")
    ("console_logging_level", po::value<std::string>(), "severity logging level on std output")
    ("file_logging_level", po::value<std::string>(), "severity logging level in file")
    ("max_colouring_depth", po::value<std::string>(), "max depth in the colouring stage, default is 1, inputting the word MAX will result in no depth limit");

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

  if (vm.count("ls_min_tp_size") != 1) {
    std::cerr << "Min size of grpc layout service pool not specified\n";
    return true;
  }

  if (vm.count("ls_max_tp_size") != 1) {
    std::cerr << "Max size of grpc layout service pool not specified\n";
    return true;
  }

  if (vm.count("console_logging_level") != 1) {
    std::cerr << "Console logging level not specified\n";
    return true;
  }

  if (vm.count("file_logging_level") != 1) {
    std::cerr << "File logging level not specified\n";
    return true;
  }

  return false;
}


void handleSigTStp(int sigtstp) {
  logging::log_info("Received SIGTSTP, will attempt to close the service...");
  // grpcLayoutServicePtr->Shutdown();
  *mainProcessRunningPtr = false;
}


void handleSigint(int sigint) {
  logging::log_info("Received SIGINT, will attempt to close the service...");
  // grpcLayoutServicePtr->Shutdown();
  *mainProcessRunningPtr = false;
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
  size_t minLayoutServiceThreadPoolSize;
  size_t maxLayoutServiceThreadPoolSize;

  layoutServiceIpAddress = vm["ls_ip_addr"].as<std::string>();
  layoutServicePort = vm["ls_port"].as<int>();
  minLayoutServiceThreadPoolSize = vm["ls_min_tp_size"].as<int>();
  maxLayoutServiceThreadPoolSize = vm["ls_max_tp_size"].as<int>();

  uint32_t maxColouringDepth = 1;
  if (vm.count("max_colouring_depth") != 0) {
    std::string maxColouringDepthStr = vm["max_colouring_depth"].as<std::string>();
    maxColouringDepth = (maxColouringDepthStr == "MAX") 
      ? std::numeric_limits<uint32_t>::max()
      : std::stoi(maxColouringDepthStr);
  }

  if (minLayoutServiceThreadPoolSize > maxLayoutServiceThreadPoolSize) {
    std::cerr << "Invalid values for thread pool size specification: min cannot be greater than max";
    return 1;
  }

  logging::initLogging(
    "/app/old_log_data/",
    logging::convertStrToTrivialSeverity(vm["console_logging_level"].as<std::string>()), 
    logging::convertStrToTrivialSeverity(vm["file_logging_level"].as<std::string>())
  );

  logging::log_info(
    "Starting grpc server on " + layoutServiceIpAddress + ":"
    + std::to_string(layoutServicePort) + "..." 
  );

  signal(SIGTSTP, handleSigTStp);
  signal(SIGINT, handleSigint);

  GrpcLayoutService grpcLayoutService(
    createDefaultGraphColourerAlgParams(), 
    createDefaultLayoutDrawerAlgParams(), 
    maxColouringDepth,
    2.0
  );
  grpc::ServerBuilder builder;
  builder.AddListeningPort(
    layoutServiceIpAddress + ":" + std::to_string(layoutServicePort), 
    grpc::InsecureServerCredentials()
  );
  builder.SetSyncServerOption(
    grpc::ServerBuilder::SyncServerOption::NUM_CQS, 1
  );
  if (minLayoutServiceThreadPoolSize > 0) {
    builder.SetSyncServerOption(
        grpc::ServerBuilder::SyncServerOption::MIN_POLLERS, minLayoutServiceThreadPoolSize
    );
  }
  if (maxLayoutServiceThreadPoolSize > 0) {
    builder.SetSyncServerOption(
        grpc::ServerBuilder::SyncServerOption::MAX_POLLERS, maxLayoutServiceThreadPoolSize
    );
  }
  builder.RegisterService(&grpcLayoutService);
  std::unique_ptr<grpc::Server> grpcServer(builder.BuildAndStart());
  grpcLayoutServicePtr = grpcServer.get();
  logging::log_info(
    "Started grpc server on " + layoutServiceIpAddress + ":"
    + std::to_string(layoutServicePort) + "." 
  );
  // grpcServer->Wait();
  std::thread grpcServerThread([&grpcServer]() -> void {
    grpcServer->Wait();
  });
  
  bool grpcServerRunning = true;
  mainProcessRunningPtr = &grpcServerRunning;
  while (grpcServerRunning) {
    std::this_thread::sleep_for(std::chrono::milliseconds(500));
  }

  grpcServer->Shutdown();
  grpcServerThread.join();

  logging::log_info(
    "Shutting down grpc server on " + layoutServiceIpAddress + ":"
    + std::to_string(layoutServicePort) + "..." 
  );

  logging::log_info(
    "Shut down grpc server on " + layoutServiceIpAddress + ":"
    + std::to_string(layoutServicePort) + "." 
  );

  return 0;
}

#undef EPS_FOR_SIGNUM
#undef _signum