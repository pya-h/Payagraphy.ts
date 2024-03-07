
export class ParallelJob {
    private _lastAchievment: any;
    private _lastDutyTime: number;
    private _running: boolean;
    private _dutyParameters: any[];
    private _interval: number;
    private _duty: Function

    // Define objects from this and use it in TelegramBot, it will does some parallel jobs in the bot by a specific interval [in minutes]
    constructor(interval: number, duty: Function, ...params: any[]) {
        this._lastAchievment = null;
        this._lastDutyTime = null;
        this._running = false;
        this._dutyParameters = params;
    }
        
    go(): ParallelJob {
        // Start running...
        this._lastDutyTime = Date.now();
        this._running = true;
        return this;
    }

    do(): void {
        this._lastAchievment = this._duty(...this._dutyParameters);
        this._lastDutyTime = Date.now();
    }

    stop(): void {
        this._running = false;
    }

    get lastAchievment(): any {
        return this._lastAchievment;
    }

    get lastDutyTime(): number {
        return this._lastDutyTime;
    }

    get running(): boolean {
        return this._running;
    }



}