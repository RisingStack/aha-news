import Alpine from "alpinejs";
import { type AlpineComponent } from "alpinejs";

declare global {
  interface Window {
    Alpine: typeof Alpine;
  }
}

export interface ComponentObject {
  name: string;
  data: AlpineComponent<any>;
}

window.Alpine = Alpine;

const componentObjects = [];

export function offloadData(componentObject) {
  componentObjects.push(componentObject);
}

export function loadComponents() {
  for (const componentObject of componentObjects) {
    Alpine.data(componentObject.name, () => componentObject.data);
  }
  Alpine.start();
}

export default Alpine;
