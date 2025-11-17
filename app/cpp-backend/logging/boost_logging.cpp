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

BoostLogger::BoostLogger(
    const std::string& logFileDir,
    trivial_severity_level consoleSeverityLevel, 
    trivial_severity_level fileSeverityLevel
) {
    
    constexpr size_t logFileRotationSize = 12 * 1024 * 1024; // 12 MB

    boost::log::add_common_attributes();   
    m_logger = boost::make_shared<severity_logger_mt<trivial_severity_level>>();
    m_consoleSink = boost::make_shared<console_sink_t>();
    boost::shared_ptr<std::ostream> consoleStream(&std::cout, boost::null_deleter());
    m_consoleSink->locked_backend()->add_stream(consoleStream);

    m_consoleSink->set_formatter(
        expr::stream 
        << "[" << expr::format_date_time<boost::posix_time::ptime>("TimeStamp", "%Y-%m-%d %H:%M:%S") << "] "
        << "<" << boost::log::trivial::severity << "> "
        << expr::smessage
    );

    m_consoleSink->set_filter(
        boost::log::trivial::severity >= consoleSeverityLevel
    );

    boost::log::core::get()->add_sink(m_consoleSink);
    auto backend = boost::make_shared<boost::log::sinks::text_file_backend>(
        boost::log::keywords::file_name = "log_%Y-%m-%d__%H-%M.log", 
        boost::log::keywords::open_mode = std::ios_base::app, 
        boost::log::keywords::rotation_size = logFileRotationSize, 
        boost::log::keywords::target = logFileDir
    );

    m_fileSink = boost::shared_ptr<file_sink_t>(new file_sink_t(backend));
    m_fileSink->set_formatter(
        expr::stream 
        << "[" << expr::format_date_time<boost::posix_time::ptime>("TimeStamp", "%Y-%m-%d %H:%M:%S") << "] "
        << "<" << boost::log::trivial::severity << "> "
        << expr::smessage
    );

    m_fileSink->set_filter(
        boost::log::trivial::severity >= fileSeverityLevel
    );

    boost::log::core::get()->add_sink(m_fileSink);
}

void initLogging(
    const std::string& logFileDir, 
    trivial_severity_level consoleSeverityLevel, 
    trivial_severity_level fileSeverityLevel
) {
    BoostLogger::createInstance(logFileDir, consoleSeverityLevel, fileSeverityLevel);
}

}