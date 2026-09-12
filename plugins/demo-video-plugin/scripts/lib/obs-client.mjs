// A zero-dependency obs-websocket v5 client (OBS 28+, rpcVersion 1), on Node's global
// WebSocket (Node 22+). Protocol: https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md
//
// The password comes from OBS_WEBSOCKET_PASSWORD and never from a flag or a file in a
// repo. Nothing here prints it.

import { createHash, randomUUID } from 'node:crypto';

const OP = { Hello: 0, Identify: 1, Identified: 2, Event: 5, Request: 6, RequestResponse: 7 };

export const EventSubscription = { General: 1, Scenes: 4, Inputs: 8, Outputs: 64 };

export const RecordState = {
  STARTED: 'OBS_WEBSOCKET_OUTPUT_STARTED',
  STOPPED: 'OBS_WEBSOCKET_OUTPUT_STOPPED',
  PAUSED: 'OBS_WEBSOCKET_OUTPUT_PAUSED',
  RESUMED: 'OBS_WEBSOCKET_OUTPUT_RESUMED',
};

const CLOSE_REASONS = {
  4009: 'rejected the password — OBS_WEBSOCKET_PASSWORD does not match OBS → Tools → WebSocket Server Settings',
  4010: 'does not speak rpcVersion 1 — this client needs obs-websocket 5.x (OBS 28 or newer)',
  4011: 'invalidated the session',
};

export class ObsError extends Error {
  constructor(requestType, code, comment) {
    super(`OBS ${requestType} failed (${code})${comment ? `: ${comment}` : ''}`);
    this.requestType = requestType;
    this.code = code;
  }
}

const sha256base64 = (text) => createHash('sha256').update(text).digest('base64');

/**
 * Connect and identify. Resolves to a client:
 *   call(requestType, requestData?) -> responseData
 *   callAndWait(requestType, requestData, eventType, predicate, timeoutMs) -> { response, event }
 *     Most OBS requests answer before they take effect; this waits for the event that says
 *     they did, and stops waiting the moment the request itself fails.
 *   close()
 */
export function connectObs({
  url = process.env.OBS_WEBSOCKET_URL || 'ws://127.0.0.1:4455',
  password = process.env.OBS_WEBSOCKET_PASSWORD,
  events = EventSubscription.Outputs,
  timeoutMs = 5000,
} = {}) {
  if (typeof WebSocket !== 'function') {
    return Promise.reject(new Error('this Node has no global WebSocket — the OBS client needs Node 22 or newer'));
  }

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, 'obswebsocket.json');
    const pending = new Map();
    const listeners = new Set();
    let identified = false;

    const fail = (err) => {
      clearTimeout(timer);
      if (!identified) reject(err);
      try {
        ws.close();
      } catch {
        /* already closed */
      }
    };
    const timer = setTimeout(
      () => fail(new Error(`OBS did not answer at ${url} within ${timeoutMs} ms — is OBS open with the WebSocket server enabled?`)),
      timeoutMs
    );

    const client = {
      call(requestType, requestData) {
        const requestId = randomUUID();
        return new Promise((ok, no) => {
          pending.set(requestId, { ok, no });
          ws.send(JSON.stringify({ op: OP.Request, d: { requestType, requestId, requestData } }));
        });
      },
      async callAndWait(requestType, requestData, eventType, predicate = () => true, ms = 10000) {
        let off;
        // Listen before asking: the event can arrive before the response.
        const event = new Promise((ok, no) => {
          const listener = (type, data) => {
            if (type === eventType && predicate(data)) {
              off();
              ok(data);
            }
          };
          const t = setTimeout(() => {
            off();
            no(new Error(`OBS answered ${requestType} but sent no ${eventType} within ${ms} ms`));
          }, ms);
          off = () => {
            listeners.delete(listener);
            clearTimeout(t);
          };
          listeners.add(listener);
        });
        event.catch(() => {}); // observed below; never an unhandled rejection
        try {
          const response = await client.call(requestType, requestData);
          return { response, event: await event };
        } catch (err) {
          off();
          throw err;
        }
      },
      close() {
        ws.close();
      },
    };

    ws.addEventListener('error', () =>
      fail(new Error(`cannot reach OBS at ${url} — is OBS open with Tools → WebSocket Server Settings → Enable?`))
    );

    ws.addEventListener('close', (event) => {
      const reason = CLOSE_REASONS[event.code] ?? `closed the connection (${event.code}${event.reason ? `: ${event.reason}` : ''})`;
      const err = new Error(`OBS ${reason}`);
      for (const p of pending.values()) p.no(err);
      pending.clear();
      fail(err);
    });

    ws.addEventListener('message', (message) => {
      const { op, d } = JSON.parse(message.data);
      switch (op) {
        case OP.Hello: {
          const identify = { rpcVersion: 1, eventSubscriptions: events };
          if (d.authentication) {
            if (!password) {
              fail(new Error('OBS asks for a password — set OBS_WEBSOCKET_PASSWORD (OBS → Tools → WebSocket Server Settings)'));
              return;
            }
            const secret = sha256base64(password + d.authentication.salt);
            identify.authentication = sha256base64(secret + d.authentication.challenge);
          }
          ws.send(JSON.stringify({ op: OP.Identify, d: identify }));
          break;
        }
        case OP.Identified:
          identified = true;
          clearTimeout(timer);
          resolve(client);
          break;
        case OP.RequestResponse: {
          const p = pending.get(d.requestId);
          if (!p) break;
          pending.delete(d.requestId);
          if (d.requestStatus.result) p.ok(d.responseData ?? {});
          else p.no(new ObsError(d.requestType, d.requestStatus.code, d.requestStatus.comment));
          break;
        }
        case OP.Event:
          for (const listener of [...listeners]) listener(d.eventType, d.eventData ?? {});
          break;
        default:
          break;
      }
    });
  });
}

/**
 * Point a macOS Screen Capture input at the first window whose name contains `title`.
 * A window id changes every time its app relaunches, so this runs before every take.
 */
export async function pointWindow(obs, inputName, title) {
  // Windows on another Space are not "on screen", and OBS only lists on-screen windows
  // unless show_hidden_windows is set — the list must be built with it on.
  await obs.call('SetInputSettings', { inputName, inputSettings: { type: 1, show_cursor: false, show_hidden_windows: true } });
  const { propertyItems } = await obs.call('GetInputPropertiesListPropertyItems', { inputName, propertyName: 'window' });
  const windows = propertyItems.filter((item) => item.itemValue && String(item.itemName).trim());
  const matches = windows.filter((item) => item.itemName.includes(title));
  if (!matches.length) {
    const seen = windows.slice(0, 12).map((w) => `"${w.itemName}"`).join(', ');
    throw new Error(`OBS lists no window containing "${title}". It sees: ${seen || 'nothing'}`);
  }
  const chosen = matches[0];
  await obs.call('SetInputSettings', { inputName, inputSettings: { window: chosen.itemValue } });
  return { window: chosen.itemName, id: chosen.itemValue, ambiguous: matches.length > 1 };
}

/**
 * Whether the current output settings allow pausing. PauseRecord answers success even
 * when pausing is impossible, so this is the only way to know before a take.
 */
export async function recordingCanPause(obs) {
  const param = async (parameterCategory, parameterName) =>
    (await obs.call('GetProfileParameter', { parameterCategory, parameterName })).parameterValue;
  const mode = (await param('Output', 'Mode')) ?? 'Simple';
  if (mode === 'Simple') {
    const quality = (await param('SimpleOutput', 'RecQuality')) ?? 'Stream';
    return { mode, canPause: quality !== 'Stream', detail: `RecQuality=${quality}` };
  }
  const type = (await param('AdvOut', 'RecType')) ?? 'Standard';
  if (type === 'Standard') {
    const encoder = (await param('AdvOut', 'RecEncoder')) ?? 'none';
    return { mode, canPause: encoder !== 'none', detail: `RecType=Standard RecEncoder=${encoder}` };
  }
  return { mode, canPause: null, detail: `RecType=${type}` };
}
