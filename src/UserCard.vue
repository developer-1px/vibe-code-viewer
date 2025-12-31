<template>
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
</script>
