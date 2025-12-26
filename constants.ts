
export const VUE_CODE_RAW = `<script setup lang="ts">
import useFetchMarketplaceCategory from '../../../entities/MarketplaceCategory/api/useFetchMarketplaceCategory';
import { useMarketplaceFilter } from '../model';
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
  () => typeList.value?.find((t) => t.value === type.value)?.text ?? $t('marketplace.categoryDetail'),
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
</template>`;
