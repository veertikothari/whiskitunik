export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  assignedUsers: string[];
  status: 'pending' | 'in_progress' | 'completed';
  projectId?: string;
}


export interface Contact {
  id: string;
  name: string;
  number: string;
  description: string;
  visibleTo: string[];
}

export interface TimeLog {
  id: string;
  userId: string;
  taskId: string;
  date: Date;
  timeSpent: number; // in minutes
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  tasks: Omit<Task, 'id' | 'projectId'>[];
}