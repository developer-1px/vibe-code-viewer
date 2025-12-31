<template>
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
</script>
