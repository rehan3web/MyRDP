// Import styles
import './style.css';

// Types
interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

type FilterType = 'all' | 'active' | 'completed';

// Utility function to generate unique IDs
function generateId(): string {
  // Use crypto.randomUUID() if available (requires secure context)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for non-secure contexts
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Application state
class TodoApp {
  private todos: Todo[] = [];
  private currentFilter: FilterType = 'all';
  private editingId: string | null = null;

  // DOM elements
  private todoForm: HTMLFormElement;
  private todoInput: HTMLInputElement;
  private todoList: HTMLUListElement;
  private emptyState: HTMLElement;
  private todoCount: HTMLElement;
  private clearCompletedBtn: HTMLButtonElement;
  private filterBtns: NodeListOf<HTMLButtonElement>;

  constructor() {
    // Initialize DOM elements with validation
    const todoForm = document.getElementById('todo-form');
    const todoInput = document.getElementById('todo-input');
    const todoList = document.getElementById('todo-list');
    const emptyState = document.getElementById('empty-state');
    const todoCount = document.getElementById('todo-count');
    const clearCompletedBtn = document.getElementById('clear-completed');
    const filterBtns = document.querySelectorAll('.filter-btn');

    if (!todoForm || !todoInput || !todoList || !emptyState || !todoCount || !clearCompletedBtn || filterBtns.length === 0) {
      throw new Error('Required DOM elements not found. Please check the HTML structure.');
    }

    this.todoForm = todoForm as HTMLFormElement;
    this.todoInput = todoInput as HTMLInputElement;
    this.todoList = todoList as HTMLUListElement;
    this.emptyState = emptyState as HTMLElement;
    this.todoCount = todoCount as HTMLElement;
    this.clearCompletedBtn = clearCompletedBtn as HTMLButtonElement;
    this.filterBtns = filterBtns as NodeListOf<HTMLButtonElement>;

    // Load todos from localStorage
    this.loadTodos();

    // Set up event listeners
    this.setupEventListeners();

    // Initial render
    this.render();
  }

  private setupEventListeners(): void {
    // Form submission
    this.todoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddOrUpdateTodo();
    });

    // Filter buttons
    this.filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentFilter = btn.dataset.filter as FilterType;
        this.updateFilterButtons();
        this.render();
      });
    });

    // Clear completed
    this.clearCompletedBtn.addEventListener('click', () => {
      this.clearCompleted();
    });
  }

  private handleAddOrUpdateTodo(): void {
    const text = this.todoInput.value.trim();
    
    if (!text) return;

    if (this.editingId) {
      // Update existing todo
      this.updateTodo(this.editingId, text);
      this.editingId = null;
      this.todoInput.value = '';
      this.todoInput.placeholder = 'What needs to be done?';
    } else {
      // Add new todo
      this.addTodo(text);
      this.todoInput.value = '';
    }
  }

  private addTodo(text: string): void {
    const newTodo: Todo = {
      id: generateId(),
      text,
      completed: false,
      createdAt: Date.now()
    };

    this.todos.unshift(newTodo);
    this.saveTodos();
    this.render();
  }

  private updateTodo(id: string, text: string): void {
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      todo.text = text;
      this.saveTodos();
      this.render();
    }
  }

  private deleteTodo(id: string): void {
    const todoElement = document.querySelector(`[data-id="${id}"]`);
    
    if (todoElement) {
      todoElement.classList.add('animate-slide-out');
      
      setTimeout(() => {
        this.todos = this.todos.filter(todo => todo.id !== id);
        this.saveTodos();
        this.render();
      }, 300);
    }
  }

  private toggleTodo(id: string): void {
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      this.saveTodos();
      this.render();
    }
  }

  private startEdit(id: string): void {
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      this.editingId = id;
      this.todoInput.value = todo.text;
      this.todoInput.placeholder = 'Update your task...';
      this.todoInput.focus();
    }
  }

  private clearCompleted(): void {
    this.todos = this.todos.filter(todo => !todo.completed);
    this.saveTodos();
    this.render();
  }

  private getFilteredTodos(): Todo[] {
    switch (this.currentFilter) {
      case 'active':
        return this.todos.filter(todo => !todo.completed);
      case 'completed':
        return this.todos.filter(todo => todo.completed);
      default:
        return this.todos;
    }
  }

  private updateFilterButtons(): void {
    this.filterBtns.forEach(btn => {
      if (btn.dataset.filter === this.currentFilter) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private updateStats(): void {
    const activeCount = this.todos.filter(todo => !todo.completed).length;
    this.todoCount.textContent = `${activeCount} ${activeCount === 1 ? 'task' : 'tasks'} remaining`;
    
    const hasCompleted = this.todos.some(todo => todo.completed);
    this.clearCompletedBtn.style.display = hasCompleted ? 'block' : 'none';
  }

  private createTodoElement(todo: Todo): HTMLLIElement {
    const li = document.createElement('li');
    li.className = `todo-item ${todo.completed ? 'completed' : ''} animate-slide-in`;
    li.dataset.id = todo.id;

    li.innerHTML = `
      <input 
        type="checkbox" 
        class="todo-checkbox" 
        ${todo.completed ? 'checked' : ''}
        data-action="toggle"
      />
      <span class="todo-text ${todo.completed ? 'completed' : ''}">${this.escapeHtml(todo.text)}</span>
      <div class="flex gap-2">
        <button class="btn-edit" data-action="edit">Edit</button>
        <button class="btn-delete" data-action="delete">Delete</button>
      </div>
    `;

    // Event listeners for todo item
    li.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const action = target.dataset.action;

      if (action === 'toggle') {
        this.toggleTodo(todo.id);
      } else if (action === 'edit') {
        this.startEdit(todo.id);
      } else if (action === 'delete') {
        this.deleteTodo(todo.id);
      }
    });

    return li;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private render(): void {
    const filteredTodos = this.getFilteredTodos();

    // Clear list
    this.todoList.innerHTML = '';

    // Show/hide empty state
    if (filteredTodos.length === 0) {
      this.emptyState.classList.remove('hidden');
    } else {
      this.emptyState.classList.add('hidden');
      
      // Render todos
      filteredTodos.forEach(todo => {
        const todoElement = this.createTodoElement(todo);
        this.todoList.appendChild(todoElement);
      });
    }

    // Update stats
    this.updateStats();
  }

  private saveTodos(): void {
    localStorage.setItem('todos', JSON.stringify(this.todos));
  }

  private loadTodos(): void {
    const stored = localStorage.getItem('todos');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Validate that parsed data is an array
        if (Array.isArray(parsed)) {
          // Validate each todo has required properties
          const isValid = parsed.every(todo => 
            todo && 
            typeof todo.id === 'string' && 
            typeof todo.text === 'string' && 
            typeof todo.completed === 'boolean'
          );
          if (isValid) {
            this.todos = parsed;
          } else {
            console.warn('Invalid todo data structure in localStorage');
            this.todos = [];
          }
        } else {
          this.todos = [];
        }
      } catch (e) {
        console.error('Failed to load todos:', e);
        this.todos = [];
      }
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new TodoApp();
});
