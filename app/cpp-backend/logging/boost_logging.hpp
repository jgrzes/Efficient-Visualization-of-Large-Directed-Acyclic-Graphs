#ifndef LOGGING__BOOST_LOGGING_H
#define LOGGING__BOOST_LOGGING_H

#include <memory>
#include <mutex>
#include <stdexcept>
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

void initLogging(
    const std::string& logFileDir, 
    trivial_severity_level consoleSeverityLevel, 
    trivial_severity_level fileSeverityLevel
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

    static severity_logger_mt<trivial_severity_level>* getBoostLoggerInstanceAsPtr() {
        getInstanceAsPtr()->m_logger.get();    
    }

private:

    friend void initLogging(
        const std::string& logFileDir, 
        trivial_severity_level consoleSeverityLevel, 
        trivial_severity_level fileSeverityLevel
    );

    BoostLogger(
        const std::string& logFileDir, 
        trivial_severity_level consoleLoggingLevel, 
        trivial_severity_level fileSeverityLevel
    );

    static void createInstance(
        const std::string& logFileDir, 
        trivial_severity_level consoleSeverityLevel = trivial_severity_level::debug, 
        trivial_severity_level fileSeverityLevel = trivial_severity_level::debug
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

    boost::shared_ptr<severity_logger_mt<trivial_severity_level>> m_logger = nullptr;
    boost::shared_ptr<console_sink_t> m_consoleSink = nullptr;
    boost::shared_ptr<file_sink_t> m_fileSink = nullptr;
};

inline void log_trace(const std::string& message) {
    BOOST_LOG_SEV(*(BoostLogger::getBoostLoggerInstanceAsPtr()), trivial_severity_level::trace) << message;
}

inline void log_debug(const std::string& message) {
    BOOST_LOG_SEV(*(BoostLogger::getBoostLoggerInstanceAsPtr()), trivial_severity_level::debug) << message;
}

inline void log_info(const std::string& message) {
    BOOST_LOG_SEV(*(BoostLogger::getBoostLoggerInstanceAsPtr()), trivial_severity_level::info) << message;
}

inline void log_warning(const std::string& message) {
    BOOST_LOG_SEV(*(BoostLogger::getBoostLoggerInstanceAsPtr()), trivial_severity_level::warning) << message;
}

inline void log_error(const std::string& message) {
    BOOST_LOG_SEV(*(BoostLogger::getBoostLoggerInstanceAsPtr()), trivial_severity_level::error) << message;
}

inline void log_fatal(const std::string& message) {
    BOOST_LOG_SEV(*(BoostLogger::getBoostLoggerInstanceAsPtr()), trivial_severity_level::fatal) << message;
}

}

#endif