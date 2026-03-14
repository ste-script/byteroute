<script setup lang="ts">
import Button from 'primevue/button'

const emit = defineEmits<{
  'create-tenant': []
}>()

const sections: Array<{ title: string; description: string }> = [
  {
    title: 'World Traffic',
    description: 'A live map view of where traffic enters and leaves your network.'
  },
  {
    title: 'Statistics',
    description: 'A compact summary of active sessions, throughput, and protocol mix.'
  },
  {
    title: 'Live Connections',
    description: 'A rolling list of the latest flows with controls to pause and tune volume.'
  },
  {
    title: 'Traffic Timeline',
    description: 'Historical trend charts so you can spot spikes and recurring patterns fast.'
  }
]
</script>

<template>
  <section class="panel onboarding-panel" aria-labelledby="first-tenant-wizard-title">
    <div class="panel-header">
      <h2 id="first-tenant-wizard-title" class="panel-title">Set up your first tenant</h2>
    </div>

    <div class="panel-content wizard-content">
      <ol class="wizard-steps" aria-label="First tenant onboarding steps">
        <li>
          <span class="wizard-step-title">Step 1</span>
          <p>Create a tenant workspace to isolate traffic, tokens, and subscriptions.</p>
        </li>
        <li>
          <span class="wizard-step-title">Step 2</span>
          <p>Connect your client with the generated tenant token to start streaming data.</p>
        </li>
      </ol>

      <Button
        data-test="wizard-open-create-tenant"
        icon="pi pi-plus"
        label="Create tenant"
        @click="emit('create-tenant')"
      />

      <div class="section-guide" aria-label="Dashboard section guide">
        <h3>What each section does</h3>
        <ul>
          <li v-for="section in sections" :key="section.title">
            <strong>{{ section.title }}</strong>
            <p>{{ section.description }}</p>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.onboarding-panel {
  max-width: 64rem;
  width: min(100%, 64rem);
  margin: 0 auto;
}

.wizard-content {
  display: grid;
  gap: 1rem;
}

.wizard-steps {
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.75rem;

  li {
    p {
      margin: 0.25rem 0 0;
      color: var(--p-text-muted-color);
    }
  }
}

.wizard-step-title {
  font-weight: 700;
}

.section-guide {
  margin-top: 0.5rem;

  h3 {
    margin: 0 0 0.75rem;
    font-size: 1rem;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }

  li {
    border: 1px solid var(--p-surface-border);
    border-radius: 0.75rem;
    padding: 0.75rem;
    background: color-mix(in srgb, var(--p-surface-card), transparent 10%);

    strong {
      display: block;
      margin-bottom: 0.25rem;
    }

    p {
      margin: 0;
      color: var(--p-text-muted-color);
      font-size: 0.9rem;
      line-height: 1.35;
    }
  }
}

@media (max-width: 768px) {
  .section-guide ul {
    grid-template-columns: 1fr;
  }
}
</style>
