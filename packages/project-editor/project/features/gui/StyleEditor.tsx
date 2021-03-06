import { observer } from "mobx-react";
import React from "react";

import styled from "eez-studio-ui/styled-components";

import { EditorComponent } from "eez-studio-shared/model/object";

import { Style, drawStylePreview } from "project-editor/project/features/gui/style";

////////////////////////////////////////////////////////////////////////////////

const Image = styled.img`
    display: block;
    margin: auto;
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
`;

@observer
export class StyleEditor extends EditorComponent {
    render() {
        let canvas = document.createElement("canvas");
        canvas.width = 240;
        canvas.height = 320;
        drawStylePreview(canvas, this.props.editor.object as Style);

        return <Image src={canvas.toDataURL()} />;
    }
}
