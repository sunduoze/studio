import { toJS } from "mobx";

import { makeFolder } from "eez-studio-shared/util-electron";

import {
    buildInstrumentExtension,
    IdfProperties as InstrumentIdfProperties
} from "instrument/export";
import { EezArrayObject, getProperty } from "eez-studio-shared/model/object";
import { objectToJS } from "eez-studio-shared/model/serialization";
import { OutputSectionsStore } from "eez-studio-shared/model/store";
import { Section, Type } from "eez-studio-shared/model/output";

import { ProjectStore } from "project-editor/core/store";
import { getExtensionsByCategory } from "project-editor/core/extensions";

import { Scpi } from "project-editor/project/features/scpi/scpi";

import { ExtensionDefinition } from "project-editor/project/features/extension-definitions/extension-definitions";

function getInstrumentExtensionProperties(extensionDefinition: ExtensionDefinition) {
    const project = ProjectStore.project;

    let instrumentExtensionProperties: any = {};

    let projectFeatures = getExtensionsByCategory("project-feature");
    for (let projectFeature of projectFeatures) {
        if (
            projectFeature.eezStudioExtension.implementation.projectFeature
                .collectExtensionDefinitions &&
            getProperty(
                project,
                projectFeature.eezStudioExtension.implementation.projectFeature.key
            )
        ) {
            projectFeature.eezStudioExtension.implementation.projectFeature.collectExtensionDefinitions(
                project,
                extensionDefinition,
                instrumentExtensionProperties
            );
        }
    }

    return instrumentExtensionProperties;
}

function getExtensionsToBuild() {
    let extensionDefinitions = getProperty(
        ProjectStore.project,
        "extensionDefinitions"
    ) as EezArrayObject<ExtensionDefinition>;

    return (
        extensionDefinitions &&
        extensionDefinitions._array
            .filter(extensionDefinition => !extensionDefinition.doNotBuild)
            .filter(extensionDefinition => {
                const idfFromProject = toJS(extensionDefinition);
                const instrumentIdf: InstrumentIdfProperties = idfFromProject as any;
                return instrumentIdf.extensionName && instrumentIdf.idfGuid;
            })
    );
}

export function extensionDefinitionAnythingToBuild() {
    return getExtensionsToBuild().length > 0;
}

export async function extensionDefinitionBuild() {
    const extensionsToBuild = getExtensionsToBuild();

    await Promise.all(
        extensionsToBuild.map(async extensionDefinition => {
            const idfFromProject = toJS(extensionDefinition);

            const instrumentIdf: InstrumentIdfProperties = idfFromProject as any;

            // collect extension properties
            let properties: any = {};

            // from configuration
            const configuration = ProjectStore.project.settings.build.configurations._array.find(
                configuration => configuration.name == extensionDefinition.buildConfiguration
            );
            if (configuration && configuration.properties) {
                properties = Object.assign(properties, JSON.parse(configuration.properties));
            }

            // from extension definition
            if (idfFromProject.properties) {
                properties = Object.assign(properties, JSON.parse(idfFromProject.properties));
            }

            // from other project extensions
            properties = Object.assign(
                {
                    properties
                },
                getInstrumentExtensionProperties(idfFromProject)
            );

            if (configuration) {
                properties.moreDescription = configuration.description;
            }

            if (instrumentIdf.extensionName && instrumentIdf.idfGuid) {
                let idfFileName = `${instrumentIdf.extensionName}-${
                    instrumentIdf.idfRevisionNumber
                }.zip`;

                let idfFilePath;
                if (extensionDefinition.buildFolder) {
                    let buildFolderPath = ProjectStore.getAbsoluteFilePath(
                        extensionDefinition.buildFolder
                    );
                    await makeFolder(buildFolderPath);
                    idfFilePath = buildFolderPath + "/" + idfFileName;
                } else {
                    idfFilePath = ProjectStore.getAbsoluteFilePath(idfFileName);
                }

                const scpi = getProperty(ProjectStore.project, "scpi") as Scpi;
                const subsystems = objectToJS(scpi.subsystems);
                const enums = objectToJS(scpi.enums);

                await buildInstrumentExtension(
                    instrumentIdf,

                    subsystems,

                    enums,

                    idfFilePath,

                    instrumentIdf.image && ProjectStore.getAbsoluteFilePath(instrumentIdf.image),

                    ProjectStore.project.settings.general.scpiDocFolder &&
                        ProjectStore.getAbsoluteFilePath(
                            ProjectStore.project.settings.general.scpiDocFolder
                        ),

                    properties
                );

                OutputSectionsStore.write(
                    Section.OUTPUT,
                    Type.INFO,
                    `Instrument definition file "${idfFileName}" builded.`
                );
            }
        })
    );
}
