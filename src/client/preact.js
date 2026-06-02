// pins the CDN versions ONCE so every other module imports from here, never directly.
import { h, render } from "https://esm.sh/preact@10.23.2";
import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "https://esm.sh/preact@10.23.2/hooks";
import htm from "https://esm.sh/htm@3.1.1";

export const html = htm.bind(h);
export { render, useState, useEffect, useRef, useMemo, useCallback };
