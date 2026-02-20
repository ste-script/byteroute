<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'

defineProps<{
  visible: boolean
  pending: boolean
  error: string | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'submit': [payload: { name: string; tenantId?: string }]
  'close': []
}>()

const name = ref('')
const tenantId = ref('')

function handleSubmit() {
  const payload: { name: string; tenantId?: string } = { name: name.value.trim() }
  if (tenantId.value.trim()) {
    payload.tenantId = tenantId.value.trim()
  }
  emit('submit', payload)
}

function handleHide() {
  name.value = ''
  tenantId.value = ''
  emit('close')
}
</script>

<template>
  <Dialog
    :visible="visible"
    header="Create new tenant"
    modal
    :style="{ width: '26rem' }"
    @update:visible="emit('update:visible', $event)"
    @hide="handleHide"
  >
    <form class="new-tenant-form" @submit.prevent="handleSubmit">
      <label for="new-tenant-name">Name <span aria-hidden="true">*</span></label>
      <InputText
        id="new-tenant-name"
        v-model="name"
        placeholder="e.g. Production"
        autocomplete="off"
        required
      />
      <label for="new-tenant-id">Tenant ID <span class="optional">(optional)</span></label>
      <InputText
        id="new-tenant-id"
        v-model="tenantId"
        placeholder="auto-generated from name"
        autocomplete="off"
        pattern="[a-z0-9][a-z0-9_\-]*"
        title="Lowercase letters, numbers, hyphens and underscores"
      />
      <p v-if="error" class="new-tenant-error">{{ error }}</p>
      <div class="new-tenant-actions">
        <Button type="button" label="Cancel" text @click="emit('update:visible', false)" />
        <Button
          type="submit"
          label="Create"
          :loading="pending"
          :disabled="!name.trim()"
        />
      </div>
    </form>
  </Dialog>
</template>

<style scoped lang="scss">
.new-tenant-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  label {
    font-size: 0.875rem;
    font-weight: 500;
    margin-top: 0.25rem;

    .optional {
      font-weight: 400;
      font-size: 0.8rem;
      color: var(--p-text-muted-color);
    }
  }

  .new-tenant-error {
    font-size: 0.8rem;
    color: var(--p-red-500);
    margin: 0;
  }

  .new-tenant-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
}
</style>
