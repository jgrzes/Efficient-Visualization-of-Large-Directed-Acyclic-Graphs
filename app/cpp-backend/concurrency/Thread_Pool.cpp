#include "Thread_Pool.hpp"

namespace concurrency {

void ThreadPool::start() {
    if (m_threadPoolRunning) return;
    internalStart();
}

void ThreadPool::shutDown() {
    if (!m_threadPoolRunning) return;
    m_threadPoolRunning = false;
    m_newTaskEmplacementAllowed = false;
    m_emptyTaskQueueBeforeShutDown = false;
    m_taskAcquisitionCV.notify_all();
    for (auto& thread : m_threads) {
        thread.join();
    }
    cleanUpAfterShutDown();
}


void ThreadPool::shutDownAfterEmptyingTaskQueue() {
    if (!m_threadPoolRunning) return;
    m_threadPoolRunning = false;
    m_newTaskEmplacementAllowed = false;
    m_emptyTaskQueueBeforeShutDown = true;
    m_taskAcquisitionCV.notify_all();
    for (auto& thread : m_threads) {
        thread.join();
    }
    cleanUpAfterShutDown();
}


void ThreadPool::internalStart() {
    m_threadPoolRunning = true;
    m_newTaskEmplacementAllowed = true;
    m_emptyTaskQueueBeforeShutDown = true;
    m_threads.reserve(m_threadCount);
    for (size_t i=0; i<m_threadCount; ++i) {
        m_threads.emplace_back([this]() -> void {
            std::optional<RunnableTask> currentTask;
            while (true) {    
                if (!m_threadPoolRunning && (!m_emptyTaskQueueBeforeShutDown || m_taskQueue.empty())) {
                    break;
                }

                {
                    std::unique_lock<std::mutex> lock(m_taskQueueEmplacementMutex);
                    while (m_taskQueue.empty() && m_threadPoolRunning) {
                        m_taskAcquisitionCV.wait(lock);
                    }

                    if (!m_taskQueue.empty() && (m_threadPoolRunning || m_emptyTaskQueueBeforeShutDown)) {
                        currentTask = std::move(m_taskQueue.front());
                        m_taskQueue.pop();
                    }
                }

                if (currentTask.has_value()) {
                    currentTask.value()();
                    currentTask = std::nullopt;
                }
            }
        });
    }
}


void ThreadPool::cleanUpAfterShutDown() {
    m_threads.clear();
    m_threads.shrink_to_fit();
    m_taskQueue = {};
}

}