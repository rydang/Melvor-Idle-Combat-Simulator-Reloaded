/*  Melvor Idle Combat Simulator

    Modified Copyright (C) <2020, 2021> <G. Miclotte>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

type PackageTypes = "Demo" | "Full" | "TotH";

type IDataPackage = {
    [packageName in PackageTypes]?: any;
};

class MICSR {
    isDev: boolean;
    name: string;
    shortName: string;
    gameVersion: string;
    version: string;
    majorVersion: number;
    minorVersion: number;
    patchVersion: number;
    preReleaseVersion?: string;
    dataPackage: IDataPackage;
    trials: number;
    maxTicks: number;
    DATA_VERSION: number;
    currentSaveVersion: number;
    equipmentSlotData: EquipmentObject<SlotData>;
    slayerTaskData: SlayerTaskData[];
    taskIDs: any[];
    imageNotify: (media: string, message: string, messageTheme?: StandardTheme | undefined) => void;
    cloudManager: any;
    actualGame!: Game;
    game!: Game;
    namespace!: DataNamespace;
    gamemodes!: Gamemode[];
    emptyItem!: EquipmentItem;
    skillIDs: any;
    skillNames: any;
    pets!: NamespaceRegistry<Pet>;
    dungeons!: NamespaceRegistry<Dungeon>;
    dungeonIDs!: any[];
    dungeonCount!: number;
    bardID!: string;
    monsters!: NamespaceRegistry<Monster>;
    monsterList!: Monster[];
    combatAreas!: NamespaceRegistry<CombatArea>;
    slayerAreas!: NamespaceRegistry<SlayerArea>;
    monsterIDs!: any[];
    herblorePotions!: NamespaceRegistry<HerbloreRecipe>;
    items!: ItemRegistry;
    standardSpells!: NamespaceRegistry<StandardSpell>;
    curseSpells!: NamespaceRegistry<CurseSpell>;
    auroraSpells!: NamespaceRegistry<AuroraSpell>;
    ancientSpells!: NamespaceRegistry<AncientSpell>;
    archaicSpells!: NamespaceRegistry<ArchaicSpell>;
    prayers!: NamespaceRegistry<ActivePrayer>;
    attackStylesIdx: any;
    skillNamesLC: any;
    showModifiersInstance: ShowModifiers;

    constructor(game: Game) {
        // TODO: Change to a setting
        this.isDev = true;
        // combat sim name
        this.name = 'Melvor Idle Combat Simulator Reloaded';
        this.shortName = 'Combat Simulator';

        // compatible game version
        this.gameVersion = 'v1.1.1';

        // combat sim version
        this.majorVersion = 1;
        this.minorVersion = 7;
        this.patchVersion = 0;
        this.preReleaseVersion = undefined;
        this.version = `v${this.majorVersion}.${this.minorVersion}.${this.patchVersion}`;
        if (this.preReleaseVersion !== undefined) {
            this.version = `${this.version}-${this.preReleaseVersion}`;
        }

        // simulation settings
        this.trials = 1e3;
        this.maxTicks = 1e3;
        // @ts-expect-error TS(2304): Cannot find name 'cloudManager'.
        this.cloudManager = cloudManager;
        this.DATA_VERSION = DATA_VERSION;
        this.currentSaveVersion = currentSaveVersion;
        this.equipmentSlotData = equipmentSlotData;
        this.slayerTaskData = SlayerTask.data;
        this.taskIDs = this.slayerTaskData.map((task: any) => task.display);
        this.imageNotify = imageNotify;

        this.dataPackage = {
            // Demo: {},
            // Full: {},
            // TotH: {}
        };

        this.setupGame(game);

        this.showModifiersInstance = new ShowModifiers(this, '', 'MICSR', false /* TODO */);
    }

    async initialize() {
        await this.fetchDataPackage('Demo', `/assets/data/melvorDemo.json?${this.DATA_VERSION}`);
        if (this.cloudManager.hasFullVersionEntitlement) {
            await this.fetchDataPackage('Full', `/assets/data/melvorFull.json?${this.DATA_VERSION}`);
        }
        if (this.cloudManager.hasTotHEntitlement) {
            await this.fetchDataPackage('TotH', `/assets/data/melvorTotH.json?${this.DATA_VERSION}`);
        }
    }

    versionCheck(exact: any, major: any, minor: any, patch: any, prerelease: any) {
        // check exact version match
        if (major === this.majorVersion
            && minor === this.minorVersion
            && patch === this.patchVersion
            && prerelease === this.preReleaseVersion) {
            return true;
        }
        if (exact) {
            // exact match is required
            return false;
        }
        // check minimal version match
        if (major !== this.majorVersion) {
            return major < this.majorVersion;
        }
        if (minor !== this.minorVersion) {
            return minor < this.minorVersion;

        }
        if (patch !== this.patchVersion) {
            return patch < this.patchVersion;
        }
        if (this.preReleaseVersion !== undefined) {
            if (prerelease === undefined) {
                // requires release version
                return false;
            }
            return prerelease < this.preReleaseVersion;
        }
        // this is release version, and either pre-release or release is required, so we're good
        return true;
    }

    async fetchDataPackage(id: PackageTypes, url: string) {
        const headers = new Headers();
        headers.append('Content-Type', 'application/json');
        const response = await fetch(url, {
            method: 'GET',
            headers,
        });
        if (!response.ok)
            throw new Error(`Could not fetch data package with URL: ${url}`);
        this.dataPackage[id] = (await response.json());
        this.cleanupDataPackage(id);
    }

    cleanupDataPackage (id: PackageTypes) {
        this.dataPackage[id].data.lore = undefined;
        this.dataPackage[id].data.tutorialStages = undefined;
        this.dataPackage[id].data.tutorialStageOrder = undefined;
        this.dataPackage[id].data.steamAchievements = undefined;
        this.dataPackage[id].data.shopDisplayOrder = undefined;
        this.dataPackage[id].data.shopUpgradeChains = undefined;
        this.dataPackage[id].modifications = undefined;

        const includedCategories = ['Slayer'];

        this.dataPackage[id].data.shopPurchases = this.dataPackage[id].data.shopPurchases
            .filter((x: any) => includedCategories.map((includedCategory: string) => `melvorF:${includedCategory}`).includes(x.category))

        const bannedSkills = [
            'Woodcutting', 'Firemaking', 'Fishing', 'Mining', 'Cooking', 'Smithing', 'Farming', 'Summoning',
            'Thieving', 'Fletching', 'Crafting', 'Runecrafting', 'Herblore', 'Agility', 'Astrology', 'Township',
            'Magic', 'Ranged'
        ];
        this.dataPackage[id].data.skillData = this.dataPackage[id].data.skillData
            .filter((x: any) => !bannedSkills.map((bannedSkill: string) => `melvorD:${bannedSkill}`).includes(x.skillID))
    }


    // fetching() {
    //     if (!this.cloudManager.hasFullVersionEntitlement && this.dataPackage.Demo === undefined) {
    //         return true;
    //     }
    //     if (this.cloudManager.hasFullVersionEntitlement && this.dataPackage.Full === undefined) {
    //         return true;
    //     }
    //     if (this.cloudManager.hasTotHEntitlement && this.dataPackage.TotH === undefined) {
    //         return true;
    //     }
    //     return false;
    // }

    // any setup that requires a game object
    setupGame(game: Game) {
        this.actualGame = game;
        this.game = this.actualGame; // TODO this should be a mock game object probably
        this.namespace = this.game.registeredNamespaces.getNamespace('micsr');
        if (this.namespace === undefined) {
            this.namespace = this.game.registeredNamespaces.registerNamespace("micsr", 'Combat Simulator', true);
        }
        //gamemodes
        this.gamemodes = this.game.gamemodes.allObjects.filter((x: any) => x.id !== 'melvorD:Unset');

        // empty items
        this.emptyItem = this.game.emptyEquipmentItem;

        // skill IDs
        this.skillIDs = {};
        this.skillNames = [];
        this.skillNamesLC = [];
        this.game.skills.allObjects.forEach((x: any, i: number) => {
            this.skillIDs[x.name] = i;
            this.skillNames.push(x.name);
            this.skillNamesLC.push(x.name.toLowerCase());
        });
        // pets array
        this.pets = this.actualGame.pets;
        // dg array
        this.dungeons = this.actualGame.dungeons;
        this.dungeonIDs = this.dungeons.allObjects.map((dungeon: any) => dungeon.id);
        this.dungeonCount = this.dungeonIDs.length;

        // TODO filter special dungeons
        //  this.dungeons = this.dungeons.filter((dungeon) => dungeon.id !== Dungeons.Impending_Darkness);
        // TODO filter special monsters
        //  this.dungeons[Dungeons.Into_the_Mist].monsters = [147, 148, 149];
        // monsters
        this.bardID = 'melvorF:WanderingBard';
        this.monsters = this.actualGame.monsters;
        this.monsterList = this.actualGame.monsters.allObjects;
        this.combatAreas = this.actualGame.combatAreas;
        this.slayerAreas = this.actualGame.slayerAreas;
        this.monsterIDs = [
            ...this.combatAreas.allObjects
                .map((area: any) => area.monsters.map((monster: any) => monster.id))
                .reduce((a: any, b: any) => a.concat(b), []),
            this.bardID,
            ...this.slayerAreas.allObjects
                .map((area: any) => area.monsters.map((monster: any) => monster.id))
                .reduce((a: any, b: any) => a.concat(b), []),
        ]
        // potions
        this.herblorePotions = this.actualGame.herblore.actions;
        // items
        this.items = this.actualGame.items;
        // spells
        this.standardSpells = this.actualGame.standardSpells;
        this.curseSpells = this.actualGame.curseSpells;
        this.auroraSpells = this.actualGame.auroraSpells;
        this.ancientSpells = this.actualGame.ancientSpells;
        this.archaicSpells = this.actualGame.archaicSpells;
        // prayers
        this.prayers = this.actualGame.prayers;
        // attackStyles
        this.attackStylesIdx = {};
        this.actualGame.attackStyles.allObjects.forEach((x: any, i: number) => {
            let j = i;
            if (j > 3) {
                j -= 3;
            }
            if (j > 2) {
                j -= 2;
            }
            this.attackStylesIdx[x] = j;
        });
    }

    isDungeonID(id: string) {
        this.dungeons?.getObjectByID(id) !== undefined;
    }

    /////////////
    // logging //
    /////////////
    debug(...args: any[]) {
        console.debug('MICSR:', ...args);
    }
    log(...args: any[]) {
        console.log('MICSR:', ...args);
    }
    warn(...args: any[]) {
        console.warn('MICSR:', ...args);
    }
    error(...args: any[]) {
        console.error('MICSR:', ...args);
    }
};