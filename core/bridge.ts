import {createSession, submitCommand, observeSession, parseSession} from './src/runtime/session';
import meta from './rulesets/meta.json';
import parameters from './rulesets/parameters.json';
import systems from './rulesets/systems.json';
import legacy from './rulesets/legacy.json';
import scenarios from './rulesets/scenarios.json';
import catalogs from './rulesets/catalogs.json';
const rules = {...meta,...parameters,...legacy,...systems,scenarios,catalogs};

/** UI sees only observeSession(). Every mutation is submitted through the original transition. */
export class FarmCore {
  private session:any;
  private busy = false;
  async start(saved?:string) {
    this.session = saved ? parseSession(JSON.parse(saved)) : await createSession({runId:'cocos-farm', ruleset:rules as any, seed:270927, frameworkId:'riverine'});
    return this.observe();
  }
  observe() { return observeSession(this.session); }
  save() { return JSON.stringify(this.session); }
  async act(id:string) {
    if(this.busy)throw new Error('上一项农事尚未完成');
    this.busy=true;
    try {
      const revision=this.session.record.entries.length;
      const result=await submitCommand(this.session,{commandId:`phone:${revision}:${id}`,expectedRevision:revision,actionId:id});
      this.session=result.session;
      return this.observe();
    } finally { this.busy=false; }
  }
}

export * from './src/game/scene/geometry';
export * from './src/game/scene/layout';
export * from './src/game/scene/world';
