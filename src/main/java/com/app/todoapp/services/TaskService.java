package com.app.todoapp.services;

import com.app.todoapp.models.Task;
import com.app.todoapp.repository.TaskRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class TaskService {
    private final TaskRepository taskRepository;

    public TaskService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    public List<Task> getAllTasks() {
        return taskRepository.findAll();
    }

    public List<Task> getTasksByDueDate(LocalDate dueDate) {
        return taskRepository.findByDueDate(dueDate);
    }

    public Task saveTask(Task task) {
        return taskRepository.save(task);
    }

    public Optional<Task> updateTask(Long id, Task newTaskData) {
        return taskRepository.findById(id).map(task -> { // this wont be executed if Optional.empty()
           task.setTitle(newTaskData.getTitle());
           task.setCompleted(newTaskData.getCompleted());
           task.setStatus(newTaskData.getStatus());
           task.setDueDate(newTaskData.getDueDate());
           task.setDescription(newTaskData.getDescription());
           return taskRepository.save(task);
        });
    }

    public boolean deleteTask(Long id) {
        if (taskRepository.existsById(id)) {
            taskRepository.deleteById(id);
            return true;
        }
        return false;
    }
    

    public Optional<Task> getTaskById(Long id) {
        return taskRepository.findById(id);
    }
}
