#include "boost_logging.hpp"

#include <boost/log/utility/setup/common_attributes.hpp>
#include <boost/core/null_deleter.hpp>
#include <boost/log/expressions.hpp>
#include <boost/log/expressions/formatters/date_time.hpp>
#include <boost/log/support/date_time.hpp>
#include <boost/date_time/posix_time/posix_time.hpp>

namespace logging {

std::unique_ptr<BoostLogger> BoostLogger::s_boostLoggerInstance = nullptr;
std::mutex BoostLogger::s_instanceCreationMutex = std::mutex();

namespace expr = boost::log::expressions;

layout_service_severity_level convertStrToTrivialSeverity(
    const std::string& layoutServiceSeverityLevelAsStr
) {
    if (layoutServiceSeverityLevelAsStr == "trace_vv") {
        return layout_service_severity_level::trace_vv;
    } else if (layoutServiceSeverityLevelAsStr == "trace_v") {
        return layout_service_severity_level::trace_v;
    } else if (layoutServiceSeverityLevelAsStr == "trace") {
        return layout_service_severity_level::trace;
    } else if (layoutServiceSeverityLevelAsStr == "debug") {
        return layout_service_severity_level::debug;
    } else if (layoutServiceSeverityLevelAsStr == "info") {
        return layout_service_severity_level::info;
    } else if (layoutServiceSeverityLevelAsStr == "warning") {
        return layout_service_severity_level::warning;
    } else if (layoutServiceSeverityLevelAsStr == "error") {
        return layout_service_severity_level::error;
    } else if (layoutServiceSeverityLevelAsStr == "fatal") {
        return layout_service_severity_level::fatal;
    }

    throw std::runtime_error{
        "Convert String to Trivial Severity Level error: unknown string conversion (cannot convert from "
        + layoutServiceSeverityLevelAsStr + ")"
    };
}

BoostLogger::BoostLogger(
    const std::string& logFileDir,
    layout_service_severity_level consoleSeverityLevel, 
    layout_service_severity_level fileSeverityLevel
) {
    
    constexpr size_t logFileRotationSize = 12 * 1024 * 1024; // 12 MB

    boost::log::add_common_attributes();   
    m_logger = boost::make_shared<severity_logger_mt<layout_service_severity_level>>();
    m_consoleSink = boost::make_shared<console_sink_t>();
    boost::shared_ptr<std::ostream> consoleStream(&std::cout, boost::null_deleter());
    m_consoleSink->locked_backend()->add_stream(consoleStream);

    m_consoleSink->set_formatter(
        expr::stream 
        << "[" << expr::format_date_time<boost::posix_time::ptime>("TimeStamp", "%Y-%m-%d %H:%M:%S") << "] "
        // << "<" << boost::log::trivial::severity << "> "
        << "<" << expr::attr<layout_service_severity_level>("Severity") << "> "
        << expr::smessage
    );

    m_consoleSink->set_filter(
        expr::attr<layout_service_severity_level>("Severity") >= consoleSeverityLevel
    );

    boost::log::core::get()->add_sink(m_consoleSink);
    auto backend = boost::make_shared<boost::log::sinks::text_file_backend>(
        boost::log::keywords::file_name = "/app/log_data/log_%Y-%m-%d__%H-%M.log", 
        boost::log::keywords::open_mode = std::ios_base::app, 
        boost::log::keywords::rotation_size = logFileRotationSize, 
        boost::log::keywords::target = logFileDir
    );

    m_fileSink = boost::shared_ptr<file_sink_t>(new file_sink_t(backend));
    m_fileSink->set_formatter(
        expr::stream 
        << "[" << expr::format_date_time<boost::posix_time::ptime>("TimeStamp", "%Y-%m-%d %H:%M:%S") << "] "
        // << "<" << boost::log::trivial::severity << "> "
        << "<" << expr::attr<layout_service_severity_level>("Severity") << "> "
        << expr::smessage
    );

    m_fileSink->set_filter(
        expr::attr<layout_service_severity_level>("Severity") >= fileSeverityLevel
    );

    boost::log::core::get()->add_sink(m_fileSink);
}

void initLogging(
    const std::string& logFileDir, 
    layout_service_severity_level consoleSeverityLevel, 
    layout_service_severity_level fileSeverityLevel
) {
    BoostLogger::createInstance(logFileDir, consoleSeverityLevel, fileSeverityLevel);
}

}