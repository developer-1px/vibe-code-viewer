
// export const DEFAULT_ENTRY_FILE = 'src/pages/MarketplaceIndex.vue';
export const DEFAULT_ENTRY_FILE = 'src/App.tsx';
// export const DEFAULT_ENTRY_FILE = 'src/hooks/useUsers.ts';

export const DEFAULT_FILES: Record<string, string> = {
  // ===== React/TSX Example =====
  'src/App.tsx': `import React, { useState, useEffect } from 'react';
import UserList from './components/UserList';
import { useUsers } from './hooks/useUsers';

const App: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { users, loading, error } = useUsers();

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    document.title = \`Users (\${filteredUsers.length})\`;
  }, [filteredUsers.length]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="app">
      <h1>User Management</h1>
      <input
        type="text"
        placeholder="Search users..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <UserList users={filteredUsers} />
    </div>
  );
};

export default App;`,

  'src/components/UserList.tsx': `import React from 'react';
import UserCard from './UserCard';
import { User } from '../types';

interface UserListProps {
  users: User[];
}

const UserList: React.FC<UserListProps> = ({ users }) => {
  return (
    <div className="user-list">
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
};

export default UserList;`,

  'src/components/UserCard.tsx': `import React, { useState } from 'react';
import { User } from '../types';
import { formatDate } from '../utils/formatters';

interface UserCardProps {
  user: User;
}

const UserCard: React.FC<UserCardProps> = ({ user }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="user-card" onClick={() => setIsExpanded(!isExpanded)}>
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      {isExpanded && (
        <div className="details">
          <p>Joined: {formatDate(user.createdAt)}</p>
          <p>Role: {user.role}</p>
        </div>
      )}
    </div>
  );
};

export default UserCard;`,

  'src/hooks/useUsers.ts': `import { useState, useEffect } from 'react';
import { fetchUsers } from '../utils/api';
import { User } from '../types';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const data = await fetchUsers();
        setUsers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  return { users, loading, error };
}`,

  'src/utils/api.ts': `import { User } from '../types';

export async function fetchUsers(): Promise<User[]> {
  const response = await fetch('/api/users');
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  return response.json();
}

export async function createUser(userData: Partial<User>): Promise<User> {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  return response.json();
}`,

  'src/utils/formatters.ts': `export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}`,

  'src/types.ts': `export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  createdAt: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
}`,

  // ===== Vue Example (기존 코드) =====
  'src/pages/MarketplaceIndex.vue': `<script setup lang="ts">
import MarketplaceButtonReset from '~~/layers/4-marketplace/pages/marketplace/features/filter+search/ui/MarketplaceButtonReset.vue';
import MarketplaceInputSearch from '~~/layers/4-marketplace/pages/marketplace/features/filter+search/ui/MarketplaceInputSearch.vue';
import MarketplaceSelectorSoftware from '~~/layers/4-marketplace/pages/marketplace/features/filter+search/ui/MarketplaceSelectorSoftware.vue';
import MarketplaceSelectorSortOrder from '~~/layers/4-marketplace/pages/marketplace/features/filter+search/ui/MarketplaceSelectorSortOrder.vue';
import MarketplaceSelectorType from '~~/layers/4-marketplace/pages/marketplace/features/filter+search/ui/MarketplaceSelectorType.vue';
</script>

<template>
  <Sticky limit=".container .inner-wrap">
    <div class="list">
      <ScrollMenu type="intro intro-marketplace">
        <MarketplaceSelectorSoftware />
        <MarketplaceSelectorType />
        <MarketplaceButtonReset />
      </ScrollMenu>

      <div class="filter">
        <MarketplaceSelectorSortOrder />
        <MarketplaceInputSearch />
      </div>
    </div>
  </Sticky>
</template>

<style scoped lang="less">
@import '@/less/solutionUseIndex';
</style>`,

  // --- Stubs for UI components to allow visualization ---
  'src/layers/4-marketplace/pages/marketplace/features/filter+search/ui/MarketplaceButtonReset.vue': `<script setup lang="ts"></script><template><button>Reset</button></template>`,
  'src/layers/4-marketplace/pages/marketplace/features/filter+search/ui/MarketplaceInputSearch.vue': `<script setup lang="ts"></script><template><input type="text" /></template>`,
  'src/layers/4-marketplace/pages/marketplace/features/filter+search/ui/MarketplaceSelectorSoftware.vue': `<script setup lang="ts"></script><template><select></select></template>`,
  'src/layers/4-marketplace/pages/marketplace/features/filter+search/ui/MarketplaceSelectorSortOrder.vue': `<script setup lang="ts"></script><template><select>Order</select></template>`,

  // --- Main Logic Component (Refactored from original Marketplace.vue) ---
  'src/layers/4-marketplace/pages/marketplace/features/filter+search/ui/MarketplaceSelectorType.vue': `<script setup lang="ts">
import useFetchMarketplaceCategory from '~/entities/MarketplaceCategory/api/useFetchMarketplaceCategory';
import { useMarketplaceFilter } from '~/model';
import _ from 'lodash';
import { useFetchMarketplaceList } from '~/entities/MarketplaceItem/api/useFetchMarketplaceList';
import { useScreen } from '~/features/useScreen';

const { t: $t } = useI18n();

const { data: categoryListData } = await useFetchMarketplaceCategory();
const { data: marketplaceList } = await useFetchMarketplaceList();

const { screenNow: screenSize } = storeToRefs(useScreen());
const { categoryCode, type } = useMarketplaceFilter();

const isShowDetail = ref(false);

const isDim = (code: string) => {
  return !_.find(marketplaceList.value, (t) => t.categoryCode2 === code);
};

const route = useRoute();
const router = useRouter();

const marketplaceCategory = computed(() => categoryListData.value || []);

const typeClc = computed(() => (!isShowDetail.value && type.value ? 'selected' : ''));

const categoryList = computed(() =>
  marketplaceCategory.value.map((t) => ({
    categoryCode: t.categoryCode1,
    value: t.categoryCode2,
    text: t.categoryCode2Name,
    isDisable: isDim(t.categoryCode2),
  })),
);

const typeList = computed(() => {
  if (!categoryCode.value || categoryCode.value === 'all') return categoryList.value;

  return _.filter(categoryList.value, {
    categoryCode: categoryCode.value,
  });
});

const typeBtnText = computed(
  () => typeList.value?.find((t) => t.value === type.value)?.text ?? $t('marketplace.categoryDetail')
);

function handleSetType(code: string) {
  isShowDetail.value = false;
  router.push({ query: { ...route.query, type: code, page: 1 } });
}
</script>

<template>
  <DropDown v-model="isShowDetail" :clcSet="typeClc">
    <template #btn>
      {{ typeBtnText }}
    </template>

    <template #title>{{ $t('marketplace.categoryDetail') }}</template>

    <template #content>
      <ul class="dropdown-content" :class="{ 'multi-line': screenSize !== 'sm' }">
        <li
          v-for="(item, index) in typeList"
          :key="index"
          class="dropdown-item"
          :class="{
            'dropdown-item-selected': item.value === type,
            'dropdown-item-disabled': item.isDisable,
          }"
        >
          <Check>
            {{ item.text }}
            <input
              v-model="type"
              type="radio"
              :disabled="item.isDisable"
              :value="item.value"
              @change="handleSetType(item.value)"
            />
          </Check>
        </li>
      </ul>
    </template>
  </DropDown>
</template>`,

  'src/model.ts': `import { useRouteQuery } from 'vue-router';

export function useMarketplaceFilter() {
  const categoryCode = useRouteQuery<string>('category', '');
  const type = useRouteQuery<string>('type', '');
  const order = useRouteQuery<string>('order', 'time');
  const searchKey = useRouteQuery<string>('searchKey', '');
  const page = useRouteQuery('page', 1, { transform: Number });

  return new (class {
    categoryCode = categoryCode;
    type = type;
    page = page;
    order = order;
    searchKey = searchKey;
  })();
}`,

  'src/entities/MarketplaceCategory/api/useFetchMarketplaceCategory.ts': `export default function useFetchMarketplaceCategory() {
    const data = ref([]);
    // Mock API call
    return { data };
}`,

  'src/entities/MarketplaceItem/api/useFetchMarketplaceList.ts': `export function useFetchMarketplaceList() {
    const data = ref([]);
    return { data };
}`,

  'src/features/useScreen.ts': `export function useScreen() {
    const screenNow = ref('lg');
    return { screenNow };
}`
};