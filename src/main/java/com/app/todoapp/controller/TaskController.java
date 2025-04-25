package com.app.todoapp.controller;

import com.app.todoapp.models.Task;
import com.app.todoapp.models.TaskStatus;
import com.app.todoapp.services.TaskService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;

import java.time.LocalDate;
import java.util.List;

@Tag(name = "Task Management", description = "APIs for managing tasks")
@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @Operation(summary = "Get all tasks", description = "Retrieve a list of all tasks")
    @GetMapping
    public List<Task> getAllTasks() {
        return taskService.getAllTasks();
    }

    @Operation(summary = "Get task by ID", description = "Retrieve a task by its unique ID")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Task found"),
        @ApiResponse(responseCode = "404", description = "Task not found")
    })
    @GetMapping("/{id}")
    public ResponseEntity<Task> getTaskById(
            @Parameter(description = "ID of the task to retrieve", example = "1") @PathVariable long id) {
        return taskService.getTaskById(id)
                .map(task -> ResponseEntity.ok(task))
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Get tasks by due date", description = "Retrieve tasks that are due on a specific date")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Tasks found"),
        @ApiResponse(responseCode = "204", description = "No tasks found for the given due date")
    })
    @GetMapping("/dueDate/{dueDate}")
    public ResponseEntity<List<Task>> getTasksByDueDate(
            @Parameter(description = "Due date to filter tasks (format: yyyy-MM-dd)", example = "2025-04-24") @PathVariable LocalDate dueDate) {
        List<Task> tasks = taskService.getTasksByDueDate(dueDate);
        if (tasks.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(tasks);
    }

    @Operation(summary = "Create a new task", description = "Add a new task to the system")
    @ApiResponse(responseCode = "200", description = "Task created successfully")
    @PostMapping
    public Task createTask(
            @Parameter(description = "Task object to be created") @RequestBody Task task) {
        if (task.getCompleted() == null) {
            task.setCompleted(false);
        }
        if (task.getStatus() == null) {
            task.setStatus(TaskStatus.UNSTARTED);
        }
        return taskService.saveTask(task);
    }

    @Operation(summary = "Update an existing task", description = "Update the details of an existing task")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Task updated successfully"),
        @ApiResponse(responseCode = "404", description = "Task not found")
    })
    @PutMapping("/{id}")
    public ResponseEntity<Task> updateTask(
            @Parameter(description = "ID of the task to update", example = "1") @PathVariable long id,
            @Parameter(description = "Updated task details") @RequestBody Task taskDetails) {
        return taskService.updateTask(id, taskDetails)
                .map(updatedTask -> ResponseEntity.ok(updatedTask))
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Delete a task", description = "Delete a task by its unique ID")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Task deleted successfully"),
        @ApiResponse(responseCode = "404", description = "Task not found")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(
            @Parameter(description = "ID of the task to delete", example = "1") @PathVariable Long id) {
        if (taskService.deleteTask(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}