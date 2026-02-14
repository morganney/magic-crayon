import './defined.js'

const app = document.querySelector<HTMLDivElement>('#app')

if (app) {
  app.innerHTML = `
    <div style="height: 100dvh; width: 100%; box-sizing: border-box;">
      <magic-crayon serialization="blob"></magic-crayon>
    </div>
  `
}
