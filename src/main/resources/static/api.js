const API_URL = "http://localhost:8080/api/tasks"

async function sendRequest(method, endpoint = "", body = null) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, options)

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    return response;
  } catch (error) {
    console.error("Error in API request:", error)
    return null;
  }
}

export async function getAllTasks() {
  const response = await sendRequest("GET")
  if (!response) return [];
  return await response.json();
}

export async function createTask(taskData) {
  const response = await sendRequest("POST", "", taskData)
  if (!response) return null;
  return await response.json();
}

export async function updateTask(taskId, taskData) {
  const response = await sendRequest("PUT", `/${taskId}`, taskData)
  if (!response) return null;
  return await response.json();
}

export async function deleteTask(taskId) {
  const response = await sendRequest("DELETE", `/${taskId}`)
  return response ? true : false;
}
