import { ref, computed } from 'vue';

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
};
