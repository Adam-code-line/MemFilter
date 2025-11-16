import { defineNitroPlugin } from "#imports";
import {
  DAY_IN_MS,
  runNightlyRecalculation,
} from "~~/server/utils/nightlyTask";

const scheduleNightlyJob = () => {
  const FLAG = "__memfilterNightlyJob";
  if ((globalThis as Record<string, boolean>)[FLAG]) {
    return;
  }

  (globalThis as Record<string, boolean>)[FLAG] = true;

  const computeDelay = () => {
    const targetHour = Number(process.env.NIGHTLY_TASK_HOUR ?? 3);
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setUTCHours(targetHour, 0, 0, 0);
    if (nextRun <= now) {
      nextRun.setUTCDate(nextRun.getUTCDate() + 1);
    }
    return nextRun.getTime() - now.getTime();
  };

  const run = async () => {
    try {
      await runNightlyRecalculation();
    } catch (error) {
      console.error("[nightly] Failed to run job", error);
    }
  };

  const initialDelay = computeDelay();
  setTimeout(() => {
    run();
    setInterval(run, DAY_IN_MS);
  }, initialDelay);
};

export default defineNitroPlugin(() => {
  if (process.env.NIGHTLY_TASK_DISABLED === "1") {
    return;
  }

  scheduleNightlyJob();
});
