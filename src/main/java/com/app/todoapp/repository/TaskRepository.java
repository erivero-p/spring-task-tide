package com.app.todoapp.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import com.app.todoapp.models.Task;

public interface TaskRepository extends JpaRepository<Task, Long> {
	List<Task> findByDueDate(LocalDate dueDate);
}
