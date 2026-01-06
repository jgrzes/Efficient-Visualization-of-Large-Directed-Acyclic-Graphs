#ifndef LOGGING__BOOST_LOGGING_H
#define LOGGING__BOOST_LOGGING_H

#include <memory>
#include <mutex>
#include <stdexcept>
#include <iostream>
#include <boost/log/sources/severity_logger.hpp>
#include <boost/log/trivial.hpp>
#include <boost/log/sinks/sync_frontend.hpp>
#include <boost/log/sinks/text_ostream_backend.hpp>
#include <boost/log/sinks/text_file_backend.hpp>

namespace logging {

template <typename SeverityLevel>
using severity_logger_mt = boost::log::sources::severity_logger_mt<SeverityLevel>;
using trivial_severity_level = boost::log::trivial::severity_level;
using console_sink_t = boost::log::sinks::synchronous_sink<boost::log::sinks::text_ostream_backend>;
using file_sink_t = boost::log::sinks::synchronous_sink<boost::log::sinks::text_file_backend>;

enum class layout_service_severity_level : uint8_t {
    trace_vv = 0, 
    trace_v = 1, 
    trace = 2, 
    debug = 3, 
    info = 4, 
    warning = 5, 
    error = 6, 
    fatal = 7
};

inline std::ostream& operator<<(std::ostream& os, layout_service_severity_level layoutServiceSeverityLevel) {
    switch (layoutServiceSeverityLevel) {
        case layout_service_severity_level::trace_vv:
            os << "trace_vv";
            break;
        case layout_service_severity_level::trace_v:
            os << "trace_v";
            break;
        case layout_service_severity_level::trace:
            os << "trace";
            break;
        case layout_service_severity_level::debug:
            os << "debug";
            break;
        case layout_service_severity_level::info:
            os << "info";
            break;
        case layout_service_severity_level::warning:
            os << "warning";
            break;
        case layout_service_severity_level::error:
            os << "error";
            break;
        case layout_service_severity_level::fatal:
            os << "fatal";
            break;
        default:
            throw std::runtime_error{
                "Layout service severity level to str translation error: unknown severity level"
            };
            
        return os;
    }
}

layout_service_severity_level convertStrToTrivialSeverity(
    const std::string& layoutServiceSeverityLevelAsStr
);

void initLogging(
    const std::string& logFileDir, 
    layout_service_severity_level consoleSeverityLevel, 
    layout_service_severity_level fileSeverityLevel
);

class BoostLogger {

public:

    BoostLogger(const BoostLogger& otherBoostLogger) = delete;
    BoostLogger(BoostLogger&& otherBoostLogger) = delete;
    BoostLogger& operator=(const BoostLogger& otherBoostLogger) = delete;
    BoostLogger& operator=(BoostLogger& otherBoostLogger) = delete;

    static BoostLogger* getInstanceAsPtr() {
        if (s_boostLoggerInstance == nullptr) {
            throw std::runtime_error{
                "Attempted to get an instance of a logger without creating it first"
            };
        }

        return s_boostLoggerInstance.get();
    }

    static severity_logger_mt<layout_service_severity_level>* getBoostLoggerInstanceAsPtr() {
        return getInstanceAsPtr()->m_logger.get();    
    }

    static layout_service_severity_level getConsoleLoggingLevel() {
        return getInstanceAsPtr()->m_consoleLoggingLevel;
    }

    static layout_service_severity_level getFileLoggingLevel() {
        return getInstanceAsPtr()->m_fileLoggingLevel;
    }

private:

    friend void initLogging(
        const std::string& logFileDir, 
        layout_service_severity_level consoleSeverityLevel, 
        layout_service_severity_level fileSeverityLevel
    );

    BoostLogger(
        const std::string& logFileDir, 
        layout_service_severity_level consoleLoggingLevel, 
        layout_service_severity_level fileSeverityLevel
    );

    static void createInstance(
        const std::string& logFileDir, 
        layout_service_severity_level consoleSeverityLevel = layout_service_severity_level::debug, 
        layout_service_severity_level fileSeverityLevel = layout_service_severity_level::debug
    ) {
        std::unique_lock<std::mutex> lock(s_instanceCreationMutex);
        if (s_boostLoggerInstance == nullptr) {
            s_boostLoggerInstance = std::unique_ptr<BoostLogger>(
                new BoostLogger(logFileDir, consoleSeverityLevel, fileSeverityLevel)
            );
        }
        lock.unlock();
    }

    static std::unique_ptr<BoostLogger> s_boostLoggerInstance;
    static std::mutex s_instanceCreationMutex;

    layout_service_severity_level m_consoleLoggingLevel;
    layout_service_severity_level m_fileLoggingLevel;

    boost::shared_ptr<severity_logger_mt<layout_service_severity_level>> m_logger = nullptr;
    boost::shared_ptr<console_sink_t> m_consoleSink = nullptr;
    boost::shared_ptr<file_sink_t> m_fileSink = nullptr;
};

inline layout_service_severity_level getConsoleLoggingLevel() {
    return BoostLogger::getConsoleLoggingLevel();
}

inline layout_service_severity_level getFileLoggingLevel() {
    return BoostLogger::getFileLoggingLevel();
}

inline void log_trace_vv(const std::string& message) {
    BOOST_LOG_SEV(*(BoostLogger::getBoostLoggerInstanceAsPtr()), layout_service_severity_level::trace_vv) << message;
}

inline void log_trace_v(const std::string& message) {
    BOOST_LOG_SEV(*(BoostLogger::getBoostLoggerInstanceAsPtr()), layout_service_severity_level::trace_v) << message;
}

inline void log_trace(const std::string& message) {
    BOOST_LOG_SEV(*(BoostLogger::getBoostLoggerInstanceAsPtr()), layout_service_severity_level::trace) << message;
}

inline void log_debug(const std::string& message) {
    BOOST_LOG_SEV(*(BoostLogger::getBoostLoggerInstanceAsPtr()), layout_service_severity_level::debug) << message;
}

inline void log_info(const std::string& message) {
    BOOST_LOG_SEV(*(BoostLogger::getBoostLoggerInstanceAsPtr()), layout_service_severity_level::info) << message;
}

inline void log_warning(const std::string& message) {
    BOOST_LOG_SEV(*(BoostLogger::getBoostLoggerInstanceAsPtr()), layout_service_severity_level::warning) << message;
}

inline void log_error(const std::string& message) {
    BOOST_LOG_SEV(*(BoostLogger::getBoostLoggerInstanceAsPtr()), layout_service_severity_level::error) << message;
}

inline void log_fatal(const std::string& message) {
    BOOST_LOG_SEV(*(BoostLogger::getBoostLoggerInstanceAsPtr()), layout_service_severity_level::fatal) << message;
}

}

#endif