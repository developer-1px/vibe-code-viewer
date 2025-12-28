
/**
 * Load example files using import.meta.glob if available,
 * otherwise fallback to hardcoded examples.
 */

// Hardcoded fallback examples for environments where import.meta.glob is not available
const HARDCODED_FILES: Record<string, string> = {
  // --- Vue Example ---
  'examples/vue/App.vue': `<template>
  <div class="app">
    <header>
      <h1>{{ title }}</h1>
      <p>Welcome, {{ currentUser }}</p>
    </header>

    <main>
      <UserList />

      <div class="stats">
        <p>Total Users: {{ userCount }}</p>
        <p>Active: {{ activeCount }}</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import UserList from './UserList.vue';
import { useUsers } from './useUsers';

const title = ref('User Management System');
const currentUser = ref('Admin');

const { users, activeUsers, userCount } = useUsers();

const activeCount = computed(() => activeUsers.value.length);
</script>`,

  'examples/vue/useUsers.ts': `import { ref, computed } from 'vue';

export interface User {
  id: number;
  name: string;
  email: string;
  status: 'active' | 'inactive';
}

export const useUsers = () => {
  const users = ref<User[]>([
    { id: 1, name: 'Alice Johnson', email: 'alice@example.com', status: 'active' },
    { id: 2, name: 'Bob Smith', email: 'bob@example.com', status: 'active' },
    { id: 3, name: 'Charlie Brown', email: 'charlie@example.com', status: 'inactive' }
  ]);

  const activeUsers = computed(() => {
    return users.value.filter(user => user.status === 'active');
  });

  const userCount = computed(() => users.value.length);

  const addUser = (user: User) => {
    users.value.push(user);
  };

  const removeUser = (userId: number) => {
    users.value = users.value.filter(u => u.id !== userId);
  };

  return {
    users,
    activeUsers,
    userCount,
    addUser,
    removeUser
  };
};`,

  'examples/vue/UserCard.vue': `<template>
  <div class="user-card">
    <h3>{{ user.name }}</h3>
    <p>{{ user.email }}</p>
    <span :class="statusClass">{{ user.status }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface User {
  id: number;
  name: string;
  email: string;
  status: 'active' | 'inactive';
}

const props = defineProps<{
  user: User;
}>();

const statusClass = computed(() => {
  return props.user.status === 'active' ? 'status-active' : 'status-inactive';
});
</script>`,

  'examples/vue/UserList.vue': `<template>
  <div class="user-list">
    <h2>User List ({{ userCount }} total)</h2>

    <div class="filter-bar">
      <button @click="showActive = !showActive">
        {{ showActive ? 'Show All' : 'Show Active Only' }}
      </button>
      <span>Active: {{ activeUsers.length }}</span>
    </div>

    <div class="cards">
      <UserCard
        v-for="user in displayedUsers"
        :key="user.id"
        :user="user"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import UserCard from './UserCard.vue';
import { useUsers } from './useUsers';

const { users, activeUsers, userCount } = useUsers();
const showActive = ref(false);

const displayedUsers = computed(() => {
  return showActive.value ? activeUsers.value : users.value;
});
</script>`,

  // --- React Example ---
  'examples/react/App.tsx': `import React, { useState, useMemo } from 'react';
import { UserList } from './UserList';
import { useUsers } from './useUsers';

export default function App() {
  const [title] = useState('User Management System');
  const [currentUser] = useState('Admin');

  const { users, activeUsers, userCount } = useUsers();

  const activeCount = useMemo(() => activeUsers.length, [activeUsers]);

  return (
    <div className="app">
      <header>
        <h1>{title}</h1>
        <p>Welcome, {currentUser}</p>
      </header>

      <main>
        <UserList />

        <div className="stats">
          <p>Total Users: {userCount}</p>
          <p>Active: {activeCount}</p>
        </div>
      </main>
    </div>
  );
}`,

  'examples/react/useUsers.ts': `import { useState, useMemo, useCallback } from 'react';

export interface User {
  id: number;
  name: string;
  email: string;
  status: 'active' | 'inactive';
}

const initialUsers: User[] = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', status: 'active' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', status: 'active' },
  { id: 3, name: 'Charlie Brown', email: 'charlie@example.com', status: 'inactive' }
];

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>(initialUsers);

  const activeUsers = useMemo(() => {
    return users.filter(user => user.status === 'active');
  }, [users]);

  const userCount = useMemo(() => users.length, [users]);

  const addUser = useCallback((user: User) => {
    setUsers(prev => [...prev, user]);
  }, []);

  const removeUser = useCallback((userId: number) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
  }, []);

  return {
    users,
    activeUsers,
    userCount,
    addUser,
    removeUser
  };
};`,

  'examples/react/UserCard.tsx': `import React from 'react';

export interface User {
  id: number;
  name: string;
  email: string;
  status: 'active' | 'inactive';
}

interface UserCardProps {
  user: User;
}

export const UserCard: React.FC<UserCardProps> = ({ user }) => {
  const statusClass = user.status === 'active' ? 'status-active' : 'status-inactive';

  return (
    <div className="user-card">
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      <span className={statusClass}>{user.status}</span>
    </div>
  );
};`,

  'examples/react/UserList.tsx': `import React, { useState, useMemo } from 'react';
import { UserCard } from './UserCard';
import { useUsers } from './useUsers';

export const UserList: React.FC = () => {
  const { users, activeUsers, userCount } = useUsers();
  const [showActive, setShowActive] = useState(false);

  const displayedUsers = useMemo(() => {
    return showActive ? activeUsers : users;
  }, [showActive, activeUsers, users]);

  return (
    <div className="user-list">
      <h2>User List ({userCount} total)</h2>

      <div className="filter-bar">
        <button onClick={() => setShowActive(!showActive)}>
          {showActive ? 'Show All' : 'Show Active Only'}
        </button>
        <span>Active: {activeUsers.length}</span>
      </div>

      <div className="cards">
        {displayedUsers.map(user => (
          <UserCard key={user.id} user={user} />
        ))}
      </div>
    </div>
  );
};`,

  // --- Self-Viz Fallback ---
  // Minimal src/App.tsx to ensure the app doesn't crash if it looks for the default entry file
  'src/App.tsx': `import React from 'react';
// Placeholder for Self Visualization
export default function App() {
  return (
    <div className="p-4 text-center">
      <h1 className="text-xl font-bold text-slate-200">Self Visualization</h1>
      <p className="text-slate-400">
        Source code loading is disabled in this environment. 
        Please check the "examples" folder for demo projects.
      </p>
    </div>
  );
}`
};

/**
 * Dynamically load files using import.meta.glob (if available)
 */
const loadDynamicFiles = (): Record<string, string> | null => {
  try {
    const files: Record<string, string> = {};

    // @ts-expect-error - import.meta.glob is a Vite feature
    const srcFiles = import.meta.glob('/src/**/*.{tsx,ts,vue}', {
      query: '?raw',
      eager: true
    });

    // @ts-expect-error - import.meta.glob is a Vite feature
    const exampleFiles = import.meta.glob('/examples/**/*.{tsx,ts,vue}', {
      query: '?raw',
      eager: true
    });

    // Process src files
    Object.entries(srcFiles || {}).forEach(([path, module]) => {
      const filePath = path.replace(/^\//, '');
      files[filePath] = (module as any).default;
    });

    // Process example files
    Object.entries(exampleFiles || {}).forEach(([path, module]) => {
      const filePath = path.replace(/^\//, '');
      files[filePath] = (module as any).default;
    });

    if (Object.keys(files).length > 0) {
      return files;
    }
    return null;
  } catch (error) {
    // import.meta.glob not available or failed
    return null;
  }
};

/**
 * Load files dynamically using import.meta.glob (Vite feature)
 * Falls back to hardcoded examples if not available
 */
export const loadExampleFiles = (): Record<string, string> => {
  // Try dynamic loading first
  const dynamicFiles = loadDynamicFiles();
  if (dynamicFiles) {
    console.log('📦 Loaded files dynamically via import.meta.glob:', Object.keys(dynamicFiles).length);
    return dynamicFiles;
  }

  // Fallback to hardcoded examples
  console.log('📦 Loading hardcoded example files:', Object.keys(HARDCODED_FILES).length);
  return HARDCODED_FILES;
};

/**
 * Find the most appropriate entry file from loaded files
 *
 * Priority order:
 * 1. App.vue (Vue examples)
 * 2. App.tsx (React examples)
 * 3. main.vue, main.tsx
 * 4. index.vue, index.tsx
 * 5. First .vue or .tsx file found
 */
export const findEntryFile = (files: Record<string, string>): string => {
  const filePaths = Object.keys(files);

  if (filePaths.length === 0) {
    throw new Error('No files available to find entry point');
  }

  // Priority 1: Look for App.vue or App.tsx
  const appVue = filePaths.find(path => path.endsWith('App.vue'));
  if (appVue) {
    console.log('📍 Entry file detected: App.vue ->', appVue);
    return appVue;
  }

  const appTsx = filePaths.find(path => path.endsWith('App.tsx'));
  if (appTsx) {
    console.log('📍 Entry file detected: App.tsx ->', appTsx);
    return appTsx;
  }

  // Priority 2: Look for main.vue or main.tsx
  const mainVue = filePaths.find(path => path.endsWith('main.vue'));
  if (mainVue) {
    console.log('📍 Entry file detected: main.vue ->', mainVue);
    return mainVue;
  }

  const mainTsx = filePaths.find(path => path.endsWith('main.tsx'));
  if (mainTsx) {
    console.log('📍 Entry file detected: main.tsx ->', mainTsx);
    return mainTsx;
  }

  // Priority 3: Look for index.vue or index.tsx
  const indexVue = filePaths.find(path => path.endsWith('index.vue'));
  if (indexVue) {
    console.log('📍 Entry file detected: index.vue ->', indexVue);
    return indexVue;
  }

  const indexTsx = filePaths.find(path => path.endsWith('index.tsx'));
  if (indexTsx) {
    console.log('📍 Entry file detected: index.tsx ->', indexTsx);
    return indexTsx;
  }

  // Priority 4: Fallback to first .vue or .tsx file
  const firstVue = filePaths.find(path => path.endsWith('.vue'));
  if (firstVue) {
    console.log('📍 Entry file detected: first .vue ->', firstVue);
    return firstVue;
  }

  const firstTsx = filePaths.find(path => path.endsWith('.tsx'));
  if (firstTsx) {
    console.log('📍 Entry file detected: first .tsx ->', firstTsx);
    return firstTsx;
  }

  // Last resort: return first file
  console.warn('⚠️ No standard entry file found, using first file:', filePaths[0]);
  return filePaths[0];
};
