import './defined'

const app = document.querySelector<HTMLDivElement>('#app')

if (app) {
  app.innerHTML = `
    <div style="min-height: 100vh; padding: 16px; box-sizing: border-box;">
      <magic-crayon serialization="blob"></magic-crayon>
    </div>
  `
}