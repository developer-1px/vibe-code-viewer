<template>
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
</script>
