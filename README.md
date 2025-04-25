# spring-task-tide
Esta app constituye una práctica con mi primer proyecto en Spring Boot. Es un gestor de tareas básico, con un sistema de drag-and-drop en el frontend para darle un pequeño giro.

# ¿Cómo usar?

He añadido un Makefile para levantar el contenedor de la base de datos más fácilmente. 

Para lanzar la aplicación, puedes usar `./mvnw spring-boot:run` o ejecutar el método `main`,  por ejemplo, si estás usando IntelliJ.

Una vez levantada, podéis ver la documentación de la api, en este enlace: http://localhost:8080/swagger-ui/index.html#/.
# Step-by-step

Si queréis realizar vosotros mismos esta práctica, os dejo el paso a paso que yo seguí. Si usáis este ejercicio para aprender Spring Boot, podéis omitir la parte de frontend usando la mía, ubicada en `src/main/resources/static`.

# 0 - Primeros pasos

### Configuración de la database

Deberemos añadir la siguiente configuración al archivo  [application.properties](http://application.properties), donde `jdbc` es el protocolo, `5432` el puerto de postrgres, y`todo_db` el nombre de nuestra base de datos

```java
spring.datasource.url=jdbc:postgresql://localhost:5432/todo_db
spring.datasource.username=postgres
spring.datasource.password=postgres
```

Luego hemos creado dos paquetes: models y repository. Esta estructura  es común en proyectos Spring, sigue un patrón MVC (modelo, vista, controlador) y organiza el código por responsabilidad. 

En `models/` irán las *entidades* del dominio, como Task, representan objetos del mundo real o del dominio de la app, estarán en tablas de la base de datos.

En `repository/` se guardarán las interfaces que se encarguen de acceder a la base de datos usando *JPA.*

> En este contexto, un **repositorio** es una interfaz que se conecta con la base de datos, pudiendo hacer operaciones CRUD, vinculado a una entidad.
> 

# 1 - La clase `Task`

```java
@Entity
@Data
public class Task {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;
    private String title;
    private boolean completed;

}
```

**`@Entity`** marca mi clase Task como una entidad JPA, es decir, una clase que se va a mapear a una tabla en una base de datos. De esta forma, cada instancia de Task será una fila en la tabla task (por defecto la tabla recibe el nombre de la clase, pero puede cambiarse con `@Table(name = "nombre_tabla")`.

En las entidades, es obligatorio tener un campo marcado con `@Id`, de forma que constará como la clave primaria (Primary Key) de la entidad. Este `id` puede generarse automáticamente, para ello podemos usar `@GeneratedValue(strategy = GenerationType.AUTO)`.

- Otras estrategias de generación de ids
    
    
    | Estrategia | Descripción |
    | --- | --- |
    | `AUTO` | Elige la mejor estrategia según la base de datos (por defecto). |
    | `IDENTITY` | Usa una columna auto-incrementada (como en MySQL). |
    | `SEQUENCE` | Usa una secuencia (como en PostgreSQL). |
    | `TABLE` | Usa una tabla separada para llevar la cuenta de los IDs. |

**`@Data`** es una anotación de [Lombok](https://projectlombok.org/features/Data) con la que no necesitaremos crear manualmente los getters, setters, `toString`, `equals`, ni `hashCode`. Lombok generará automáticamente estos métodos en tiempo de compilación.

# 2 - La interfaz `TaskRespository`

La definiremos dentro del paquete de repositorios como:

```java
public interface TaskRepository extends JpaRepository<Task, Long> {
}
```

Extendemos de la interfaz de Spring JpaRepository, de forma que Spring implementará automáticamente todos los métodos básico (guardar, buscar, borrar). Los parámetros genéricos de la interfaz serán: el tipo de entidad que manejará el repositorio (Task en este caso) y el tipo de la clave primaria (id) de esa entidad. 

Sin definir ningún método extra, ya tendremos implementados automáticamente:

```java
taskRepository.findAll();       // devuelve todas las tareas
taskRepository.findById(id);    // busca una tarea por ID
taskRepository.save(task);      // guarda una nueva tarea o actualiza
taskRepository.deleteById(id);  // borra una tarea por ID
```

y podremos definir métodos personalizados sólo con el nombre, como: 

```java
List<Task> findByCompleted(boolean completed);
```

Spring lo entenderá como: buscar tareas donde completed sea true o false. 

# 3 -  `TaskService` y `TaskController`

Siguiendo con el modelo MVC, vamos a crear dos paquetes nuevos: service y controller. 

Aunque estemos haciendo una aplicación muy sencilla, es buena práctica separar estas dos funciones, por si escalamos las funciones de nuestra app.

### `service`

> En Spring, un Service representa la capa de lógica de negocio de la aplicación. Aquí centralizaremos las operaciones que combinen distintas acciones, por ejemplo, buscar y luego guardar, validar antes de borrar, etc. Esto, mejorará la organización y facilitará el testeo y la reutilización de lógica.
> 

En este caso, y gracias a que en nuestro repositorio estamos extendiendo de JpaRepository, tendremos ya definidos muchos métodos en éste.

```java
@Service
public class TaskService {
    private final TaskRepository taskRepository;

    public TaskService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    public List<Task> getAllTasks() {
        return taskRepository.findAll();
    }

    public Task saveTask(Task task) {
        return taskRepository.save(task);
    }

    public Optional<Task> updateTask(Long id, Task newTaskData) {
        return taskRepository.findById(id).map(task -> { // this wont be executed if Optional.empty()
           task.setTitle(newTaskData.getTitle());
           task.setCompleted(newTaskData.isCompleted());
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
```

### `controller`

> En Spring, un Controller es el componente encargado de recibir las solicitudes del cliente (por ejemplo, el frontend) y devolver las respuestas correspondiente.
> 

```java
@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }
    @GetMapping
    public List<Task> getAllTasks() {
        return taskService.getAllTasks();
    }
    @GetMapping("/{id}")
    public ResponseEntity<Task> getTaskById(@PathVariable long id) {
        return taskService.getTaskById(id) // this returns an Optional
                .map(task -> ResponseEntity.ok(task)) //if the optional has a value, we create an HTTP response w code 200 and task object
                .orElse(ResponseEntity.notFound().build()); // else, we create a 404 response
    }
    @PostMapping
    public Task createTask(@RequestBody Task task) {
        return taskService.saveTask(task);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
        if (taskService.deleteTask(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}

```

### Sobre `Optional` y `map`

**`Optional`** es una clase de Java que se utiliza para representar un valor que puede estar presente o ausente. Es parte del paquete `java.util` y se usa comúnmente para evitar problemas con valores nulos (`null`), reduciendo el riesgo de errores como `NullPointerException`.

En el caso del método `getTaskById(Long id)`, estamos indicando que el método puede o no devolver una tarea. En caso negativo, devolvería un `Optional` vacío. 

```java
public Optional<Task> getTaskById(Long id) {
    return taskRepository.findById(id);
}
```

Algunos métodos comunes para trabajar con objetos `Optional` son:

1. **`isPresent()`**: Devuelve `true` si el valor está presente, de lo contrario `false`.
2. **`get()`**: Obtiene el valor si está presente. Lanza una excepción si está vacío.
3. **`orElse(T other)`**: Devuelve el valor si está presente, o un valor predeterminado si está vacío.
4. **`ifPresent(Consumer<? super T> action)`**: Ejecuta una acción si el valor está presente.

Por otro lado**, `map`** es un método de Optional, utilizado para acceder y modificar el valor del contenido dentro de Optional. Recibe por parámetro la función a aplicar al objeto contenido dentro del Optional y devuelve un Optional resultado de aplicarla. La función sólo se aplicará en caso de que el Optional no esté vacío. 

Por ejemplo, en el updateTask del Controller, principalmente la estamos utilizando para comprobar si el Optional que ha devuelto el service está vacío

```java
    @PutMapping("/{id}")
    public ResponseEntity<Task> updateTask(@PathVariable long id, @RequestBody Task taskDetails) {
        return taskService.updateTask(id, taskDetails)
                .map(updatedTask -> ResponseEntity.ok(updatedTask))
                .orElse(ResponseEntity.notFound().build());
    }   
```

En el service, si el Optional que devuelve findById está vacío, devolverá un Optional vacío, pero si no, seteará los campos Title y Completed de la tarea que haya encontrado antes de guardarla

```java
    public Optional<Task> updateTask(Long id, Task newTaskData) {
        return taskRepository.findById(id).map(task -> {
           task.setTitle(newTaskData.getTitle());
           task.setCompleted(newTaskData.isCompleted());
           return taskRepository.save(task);
        });
    }
```

# 4 - Escalando la app

Para hacerla más completa, he añadido nuevos campos al modelo de Task:

```java
public class Task {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;
    private String title;
    private Boolean completed;
    private TaskStatus status;
    private String description;
    private LocalDate dueDate;
}
```

- TaskStatus es una enum
    
    ```java
    public enum TaskStatus {
        UNSTARTED,
        IN_PROGRESS,
        FINISHED
    }
    ```
    

También he actualizado endpoint de crear tareas para que, por defecto, si no recibe nada, las declare como unstarted y setee `completed` a false. Para eso, he pasado de usar un `boolean` (primitivo) a la clase envolvente `Boolean`, ya que los booleanos primitivos no pueden ser nulos.

He añadido un endpoint para conseguir tareas por fecha, para lo cual, además, he tenido que incluir el método `findByDueDate` en el repositorio, pero sin necesidad de definirlo como tal por estar heredando de JpaRepository

```java
public interface TaskRepository extends JpaRepository<Task, Long> {
	List<Task> findByDueDate(LocalDate dueDate);
}
```

He actualizado el endpoint `createTask` para establecer valores por defecto (`UNSTARTED`, `false`) cuando no se recibe estado ni flag de finalización.

# 5 - Añadiendo frontend a la app

Los proyectos de Spring Boot normalmente ya están preparados para servir archivos estáticos. Dentro del proyect tree que se creó al inicializarlo, tenemos la ruta`src/main/resources/static` en la que podremos crear nuestro index.html

# 6 - Documentando la app

Spring cuenta con la herramienta Springdoc, una forma moderna y sencilla de documentar una API con Swagger/OpenAPI. Para ello, deberemos añadirlo a las dependencias:

```java
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.3.0</version>
</dependency>
```

Y lo tendremos disponible en la ruta http://localhost:8080/swagger-ui.html 

En el controller, podremos añadir una serie de anotaciones para completar nuestra documentación. Por ejemplo:

- **`@Tag`**: Se añade sobre la clase para agrupar el controlador bajo una etiqueta concreta.
- **`@Operation`**: Para añadir una descripción breve de lo que hace un endpoint.
- **`@ApiResponses`** y **`@ApiResponse`**: Para documentar posibles respuestas HTTP que pueda emitir el servidor.

Siguiendo con el endpoint para conseguir las tareas de una fecha concreta, tendríamos esto:

```
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
```
