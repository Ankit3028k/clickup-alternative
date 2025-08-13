// Simple in-memory database for testing without MongoDB
class MockDatabase {
  constructor() {
    this.users = new Map();
    this.workspaces = new Map();
    this.spaces = new Map();
    this.tasks = new Map();
    this.timeLogs = new Map();
    this.comments = new Map();
    
    // Auto-increment counters
    this.counters = {
      users: 1,
      workspaces: 1,
      spaces: 1,
      tasks: 1,
      timeLogs: 1,
      comments: 1
    };
    this.initializeData();
  }

  initializeData() {
    // Create a default user
    const defaultUser = this.createUser({
      _id: 'user_1',
      name: 'Test User',
      email: 'test@example.com',
      password: '$2a$12$y.g.1.2.3.4.5.6.7.8.9.0.1.2.3.4.5.6.7.8.9.0.1.2.3.4.5.6.7.8.9.0', // Hashed password for 'password123'
      avatar: '/images/default-avatar.png',
      status: 'active',
      preferences: { theme: 'light', timezone: 'UTC' }
    });

    // Create a default workspace for the user
    const defaultWorkspace = this.createWorkspace({
      _id: 'workspaces_1',
      name: 'My First Workspace',
      description: 'A default workspace for testing',
      owner: defaultUser._id,
      members: [{ user: defaultUser._id, role: 'admin' }],
      color: '#007bff',
      icon: 'briefcase'
    });

    // Add the workspace to the user's workspaces list
    defaultUser.workspaces.push(defaultWorkspace._id);

    // Create some default spaces within the workspace
    this.createSpace({
      _id: 'space_1',
      name: 'General Space',
      description: 'General tasks and discussions',
      workspace: defaultWorkspace._id,
      folders: []
    });

    this.createSpace({
      _id: 'space_2',
      name: 'Project Alpha',
      description: 'Tasks for Project Alpha',
      workspace: defaultWorkspace._id,
      folders: []
    });

    console.log('Mock database initialized with default data.');
  }

  generateId(collection) {
    return `${collection}_${this.counters[collection]++}`;
  }

  // User operations
  createUser(userData) {
    const id = this.generateId('users');
    const user = {
      _id: id,
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
      workspaces: []
    };
    this.users.set(id, user);
    return user;
  }

  findUserByEmail(email) {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  findUserById(id) {
    return this.users.get(id) || null;
  }

  updateUser(id, updates) {
    const user = this.users.get(id);
    if (user) {
      Object.assign(user, updates, { updatedAt: new Date() });
      this.users.set(id, user);
      return user;
    }
    return null;
  }

  // Workspace operations
  createWorkspace(workspaceData) {
    const id = this.generateId('workspaces');
    const workspace = {
      _id: id,
      ...workspaceData,
      createdAt: new Date(),
      updatedAt: new Date(),
      spaces: []
    };
    this.workspaces.set(id, workspace);
    return workspace;
  }

  findWorkspaceById(id) {
    return this.workspaces.get(id) || null;
  }

  findWorkspacesByUser(userId) {
    const workspaces = [];
    for (const workspace of this.workspaces.values()) {
      if (workspace.owner === userId || 
          workspace.members.some(member => member.user === userId)) {
        workspaces.push(workspace);
      }
    }
    return workspaces;
  }

  updateWorkspace(id, updates) {
    const workspace = this.workspaces.get(id);
    if (workspace) {
      Object.assign(workspace, updates, { updatedAt: new Date() });
      this.workspaces.set(id, workspace);
      return workspace;
    }
    return null;
  }

  deleteWorkspace(id) {
    return this.workspaces.delete(id);
  }

  // Space operations
  createSpace(spaceData) {
    const id = this.generateId('spaces');
    const space = {
      _id: id,
      ...spaceData,
      createdAt: new Date(),
      updatedAt: new Date(),
      folders: []
    };
    this.spaces.set(id, space);
    return space;
  }

  findSpaceById(id) {
    return this.spaces.get(id) || null;
  }

  findSpacesByWorkspace(workspaceId) {
    const spaces = [];
    for (const space of this.spaces.values()) {
      if (space.workspace === workspaceId) {
        spaces.push(space);
      }
    }
    return spaces;
  }

  updateSpace(id, updates) {
    const space = this.spaces.get(id);
    if (space) {
      Object.assign(space, updates, { updatedAt: new Date() });
      this.spaces.set(id, space);
      return space;
    }
    return null;
  }

  deleteSpace(id) {
    return this.spaces.delete(id);
  }

  // Task operations
  createTask(taskData) {
    const id = this.generateId('tasks');
    const task = {
      _id: id,
      ...taskData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.tasks.set(id, task);
    return task;
  }

  findTaskById(id) {
    return this.tasks.get(id) || null;
  }

  findTasks(filters = {}) {
    let tasks = Array.from(this.tasks.values());
    
    if (filters.workspace) {
      tasks = tasks.filter(task => task.workspace === filters.workspace);
    }
    
    if (filters.assignee) {
      tasks = tasks.filter(task => task.assignee === filters.assignee);
    }
    
    if (filters.status) {
      tasks = tasks.filter(task => task.status === filters.status);
    }
    
    // Sort by creation date (newest first)
    tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    if (filters.limit) {
      tasks = tasks.slice(0, filters.limit);
    }
    
    return tasks;
  }

  updateTask(id, updates) {
    const task = this.tasks.get(id);
    if (task) {
      Object.assign(task, updates, { updatedAt: new Date() });
      this.tasks.set(id, task);
      return task;
    }
    return null;
  }

  deleteTask(id) {
    return this.tasks.delete(id);
  }

  // Time tracking operations
  createTimeLog(timeData) {
    const id = this.generateId('timeLogs');
    const timeLog = {
      _id: id,
      ...timeData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.timeLogs.set(id, timeLog);
    return timeLog;
  }

  findTimeLogs(filters = {}) {
    let timeLogs = Array.from(this.timeLogs.values());
    
    if (filters.user) {
      timeLogs = timeLogs.filter(log => log.user === filters.user);
    }
    
    if (filters.task) {
      timeLogs = timeLogs.filter(log => log.task === filters.task);
    }
    
    return timeLogs;
  }

  getTimeStats(userId) {
    // Handle both MongoDB ObjectID and mock ID formats
    let userTimeLogs = this.findTimeLogs({});
    
    // Filter logs by user ID, handling different ID formats
    userTimeLogs = userTimeLogs.filter(log => {
      if (!log.user) return false;
      
      // If user is an object with _id property (MongoDB format)
      if (typeof log.user === 'object' && log.user._id) {
        return log.user._id.toString() === userId.toString();
      }
      
      // If user is a string ID (mock format)
      return log.user.toString() === userId.toString();
    });
    
    const totalTime = userTimeLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
    
    return {
      totalTime,
      logsCount: userTimeLogs.length
    };
  }

  // Clear all data
  clear() {
    this.users.clear();
    this.workspaces.clear();
    this.spaces.clear();
    this.tasks.clear();
    this.timeLogs.clear();
    this.comments.clear();
    
    // Reset counters
    Object.keys(this.counters).forEach(key => {
      this.counters[key] = 1;
    });
  }
}

// Create a singleton instance
const mockDb = new MockDatabase();

export default mockDb;
