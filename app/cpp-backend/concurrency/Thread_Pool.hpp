#ifndef CONCURRENCY__THREAD_POOL_H
#define CONCURRENCY__THREAD_POOL_H

#include <thread>
#include <mutex>
#include <condition_variable>
#include <functional>
#include <optional>
#include <vector>
#include <queue>
#include <stdexcept>

namespace concurrency {

class ThreadPool {

public:

    class RunnableTask {

    public:

        RunnableTask(
            std::function<void(void*)>&& taskFunction, 
            void* taskArgPointer = nullptr 
        ) : m_taskFunction{std::forward<std::function<void(void*)>>(taskFunction)}, 
            m_taskArgPointer{taskArgPointer}, 
            m_optTaskArgCleanUpFunction{std::nullopt} {}

        RunnableTask(
            std::function<void(void*)>&& taskFunction, 
            std::function<void(void*)>&& taskArgCleanUpFunction,
            void* taskArgPointer = nullptr
        ) : m_taskFunction{std::forward<std::function<void(void*)>>(taskFunction)}, 
            m_taskArgPointer{taskArgPointer}, 
            m_optTaskArgCleanUpFunction{std::forward<std::function<void(void*)>>(taskArgCleanUpFunction)} {}
            
        template <typename T>
        RunnableTask(
            std::function<void(void*)>&& taskFunction, 
            T* taskArgTPointer
        ) : m_taskFunction{taskFunction},
            m_taskArgPointer{static_cast<void*>(taskArgTPointer)}, 
            m_optTaskArgCleanUpFunction{[](void* voidTaskArgPointer) -> void {
                delete static_cast<T*>(voidTaskArgPointer);
            }} {}

        void operator()() {m_taskFunction(m_taskArgPointer);}    

        ~RunnableTask() {
            if (m_optTaskArgCleanUpFunction.has_value()) {
                m_optTaskArgCleanUpFunction.value()(m_taskArgPointer);
            }
        }    

    private:

        std::function<void(void*)> m_taskFunction;
        void* m_taskArgPointer;
        std::optional<std::function<void(void*)>> m_optTaskArgCleanUpFunction;

    };

    ThreadPool(size_t threadCount, bool startImmediately = true) : 
        m_threadCount{threadCount}, m_newTaskEmplacementAllowed{true} {

        if (startImmediately) internalStart();
        else m_threadPoolRunning = false;
    }

    void enqueueTask(const RunnableTask& newRunnableTask) {
        if (!m_newTaskEmplacementAllowed) {
            throw std::runtime_error{
                "Thread Pool error: new task emplacements blocked"
            };
        }
        std::unique_lock<std::mutex> lock(m_taskQueueEmplacementMutex);
        m_taskQueue.push(newRunnableTask);
        lock.unlock();
        m_taskAcquisitionCV.notify_one();
    }

    void enqueueTask(RunnableTask&& newRunnableTask) {
        if (!m_newTaskEmplacementAllowed) {
            throw std::runtime_error{
                "Thread Pool error: new task emplacements blocked"
            };
        }
        std::unique_lock<std::mutex> lock(m_taskQueueEmplacementMutex);
        m_taskQueue.push(std::move(newRunnableTask));
        lock.unlock();
        m_taskAcquisitionCV.notify_one();
    }

    template<typename T, typename... Args>
    void emplaceTaskInQueue(
        std::function<void(void*)>&& taskFunction,
        Args&&... args
    ) {
        if (!m_newTaskEmplacementAllowed) {
            throw std::runtime_error{
                "Thread Pool error: new task emplacements blocked"
            };
        }
        std::unique_lock<std::mutex> lock(m_taskQueueEmplacementMutex);
        m_taskQueue.emplace(
            taskFunction, new T(std::forward<Args>(args)...)
        );
        lock.unlock();
        m_taskAcquisitionCV.notify_one();
    }

    void start();
    void shutDown();
    void shutDownAfterEmptyingTaskQueue();

    void blockNewTaskEmplacements() {m_newTaskEmplacementAllowed = false;}

    ~ThreadPool() {shutDown();}

private:

    void internalStart();
    void cleanUpAfterShutDown();

    bool m_threadPoolRunning;
    bool m_emptyTaskQueueBeforeShutDown;
    bool m_newTaskEmplacementAllowed;

    const size_t m_threadCount;
    std::vector<std::thread> m_threads;

    std::mutex m_taskQueueEmplacementMutex;
    std::queue<RunnableTask> m_taskQueue;
    std::condition_variable m_taskAcquisitionCV;

};

}

#endif