// Материалы. Имена как в списке материалов Базиса.
const MAT_PANEL = 'Пластмасса черная';
const MAT_BLOCK = 'Пластмасса серая';
const MAT_FACE = 'Никель';
const MAT_KNOB = 'Пластмасса черная';
const MAT_BUTTON = 'Пластмасса черная';
const MAT_FRIDGE = 'Пластмасса белая';
const MAT_HOOD = 'Нержавеющая сталь';
const MAT_HOOD_PANEL = 'Пластмасса черная';
const MAT_HOOD_BTN = 'Пластмасса белая';
const MAT_COOK_FACE = 'Пластмасса черная';
const MAT_COOK_ZONE = 'Пластмасса серая';
const MAT_COOK_BLOCK = 'Нержавеющая сталь';
const COOK_FACE = 5;
const COOK_FRONT = 30;

const SCRIPT_VERSION = '1.0';
const SCRIPT_REPO = 'https://github.com/FurnFeeling/BazisScrips';

// Встройка: СВЧ или холодильник.
// Редактор скриптов v20.
// Сначала выбор техники, затем её параметры.

const FACE_LEFT = 50;
const FACE_TOP = 50;
const FACE_RIGHT = 150;
const FACE_BOTTOM = 50;
const FACE_THICK = 1;

const KNOB_RADIUS = 25;
const KNOB_THICK = 10;
const BUTTON_SIDE = 16;
const BUTTON_GAP = 6;
const BUTTON_THICK = 1;

const RECESS = 30;
const FLOOR_GAP = 16;

const model = currentFileData.model;

let form = null;
let closed = false;
let kind = '';

function Fail(e) {
    const msg = e && e.message ? e.message : String(e);
    try { UI.dialogs.ErrorBox(msg); } catch (e2) { /* без окна ошибки */ }
}

function CloseForm() {
    if (closed) return;
    closed = true;
    try { form.Visible = false; } catch (e) { /* окно уже закрыто */ }
    execution.FinishExecution();
}

function ReadModel(edit) {
    return String(edit.Text == null ? '' : edit.Text).replace(/^\s+|\s+$/g, '');
}

function ReadNum(edit, caption, allowZero) {
    const raw = String(edit.Text == null ? '' : edit.Text).replace(',', '.').replace(/^\s+|\s+$/g, '');
    const n = Number(raw);
    if (raw === '' || !isFinite(n)) throw new Error(caption + ': нужно число');
    if (allowZero) {
        if (n < 0) throw new Error(caption + ': число от нуля и больше');
    } else if (n <= 0) {
        throw new Error(caption + ': число больше нуля');
    }
    return n;
}

function Show(list, on) {
    for (let i = 0; i < list.length; i++) list[i].Visible = on;
}

function HintLine(caption, top) {
    const hint = UI.components.NewLabel(form, form);
    hint.Left = 12;
    hint.Top = top;
    hint.Width = 390;
    hint.Height = 18;
    hint.Caption = caption;
    try { hint.AutoSize = false; } catch (e) { /* ширина как задана */ }
    return hint;
}

function Field(owner, parent, top, caption, value) {
    const label = UI.components.NewLabel(owner, parent);
    label.Left = 12;
    label.Top = top + 4;
    label.Width = 250;
    label.Height = 20;
    label.Caption = caption;

    const edit = UI.components.NewTextEdit(owner, parent);
    edit.Left = 268;
    edit.Top = top;
    edit.Width = 90;
    edit.Height = 24;
    edit.Text = String(value);
    return edit;
}

function TopRadios(owner, parent, top) {
    const label = UI.components.NewLabel(owner, parent);
    label.Left = 12;
    label.Top = top + 4;
    label.Width = 160;
    label.Height = 20;
    label.Caption = 'Толщина столешницы';

    const values = [12, 20, 40];
    const buttons = [];
    for (let i = 0; i < values.length; i++) {
        const rb = UI.components.NewRadioButton(owner, parent);
        rb.Caption = String(values[i]);
        rb.Left = 180 + i * 64;
        rb.Top = top;
        rb.Width = 58;
        rb.Height = 24;
        rb.GroupIndex = 1;
        rb.Checked = values[i] === 20;
        buttons.push(rb);
    }
    return buttons;
}

function ReadTop(buttons) {
    const values = [12, 20, 40];
    for (let i = 0; i < buttons.length; i++) {
        if (buttons[i].Checked) return values[i];
    }
    return 20;
}

function Btn(parent, caption, left, top, width, height, fn) {
    const b = UI.components.NewButton(form, parent);
    b.Caption = caption;
    b.Left = left;
    b.Top = top;
    b.Width = width;
    b.Height = height;
    b.OnClick = function () {
        try { fn(); } catch (e) { Fail(e); }
    };
    return b;
}

function SkipDocs(obj) {
    obj.UseInDocs = false;
    obj.UseInEstimate = false;
    obj.UseInCutting = false;
    return obj;
}

function Appliance(body) {
    body.Build();
    return SkipDocs(body);
}

function Block(name, owner) {
    return SkipDocs(objects3d.NewBlock(name, owner));
}

function Box(owner, name, material, width, height, depth, x, y, z) {
    const body = objects3d.NewExtrusionBody(width, height, depth, owner);
    body.Name = name;
    body.MaterialName = material;
    body.Position = geometry3d.VectorMake(x, y, z);
    return Appliance(body);
}

function VerticalPipe(owner, name, material, cx, cz, diameter, height, y) {
    const radius = diameter / 2;
    const body = objects3d.NewExtrusionBody(1, 1, height, owner);
    body.Orient(AxisY, Axis_Z);
    body.Contour.Clear();
    body.Contour.AddCircle(0, 0, radius);
    body.Thickness = height;
    body.Name = name;
    body.MaterialName = material;
    body.Position = geometry3d.VectorMake(cx, y, cz);
    return Appliance(body);
}

function Disk(owner, name, material, cx, cy, radius, thick, z) {
    const body = objects3d.NewExtrusionBody(radius * 2, radius * 2, thick, owner);
    body.Contour.Clear();
    body.Contour.AddCircle(cx, cy, radius);
    body.Thickness = thick;
    body.Name = name;
    body.MaterialName = material;
    body.Position = geometry3d.VectorMake(0, 0, z);
    return Appliance(body);
}

function NickelFrame(owner, w, h, x, y, z) {
    const outer = geometry2d.NewContour();
    outer.AddRectangle(0, 0, w, h);
    const hole = geometry2d.NewContour();
    hole.AddRectangle(FACE_LEFT, FACE_BOTTOM, w - FACE_RIGHT, h - FACE_TOP);
    const frame = geometry2d.NewContour();
    const ok = geometry2d.BooleanOperation2D(
        outer, hole, geometry2d.booleanFunction2D.subtraction, frame
    );
    if (!ok) throw new Error('Не удалось построить накладку');

    const body = objects3d.NewExtrusionBody(w, h, FACE_THICK, owner);
    body.Contour.Clear();
    body.Contour.AddList(frame, true);
    body.Thickness = FACE_THICK;
    body.Name = 'Накладка';
    body.MaterialName = MAT_FACE;
    body.Position = geometry3d.VectorMake(x, y, z);
    return Appliance(body);
}

function Size(owner, name, x1, y1, z1, x2, y2, z2) {
    const size = objects3d.NewSize3D(
        name,
        geometry3d.VectorMake(x1, y1, z1),
        geometry3d.VectorMake(x2, y2, z2),
        geometry3d.VectorMake((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2),
        owner
    );
    size.Length = 0;
    size.Color = 12632256;
    return SkipDocs(size);
}

function FindLimits(list) {
    for (let i = 0; i < list.Count; i++) {
        const obj = list.Objects[i];
        if (obj && objectTypeChecker.ObjectIsLimits(obj)) return obj;
    }
    for (let i = 0; i < list.Count; i++) {
        const obj = list.Objects[i];
        if (!obj || !obj.List) continue;
        const found = FindLimits(obj);
        if (found) return found;
    }
    return null;
}

function Controls(owner, cx, cy, faceZ, outward) {
    const knobZ = outward > 0 ? faceZ : faceZ - KNOB_THICK;
    const buttonZ = outward > 0 ? faceZ : faceZ - BUTTON_THICK;
    Disk(owner, 'Ручка', MAT_KNOB, cx, cy, KNOB_RADIUS, KNOB_THICK, knobZ);

    const cols = 3;
    const rows = 3;
    const step = BUTTON_SIDE + BUTTON_GAP;
    const gridW = cols * BUTTON_SIDE + (cols - 1) * BUTTON_GAP;
    const left = cx - gridW / 2;
    const bottom = cy + KNOB_RADIUS + 50;
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            Box(
                owner, 'Кнопка', MAT_BUTTON,
                BUTTON_SIDE, BUTTON_SIDE, BUTTON_THICK,
                left + col * step, bottom + row * step, buttonZ
            );
        }
    }
}

function BuildMicrowave(p) {
    if (p.panelW <= 1 || p.panelH <= 1) throw new Error('Панель меньше 1 мм');
    if (FACE_LEFT + FACE_RIGHT >= p.panelW || FACE_TOP + FACE_BOTTOM >= p.panelH) {
        throw new Error('Панель меньше рамки накладки 50/50/150/50');
    }

    const limits = FindLimits(model);
    if (!limits) throw new Error('В фрагменте нет габаритной рамки');

    const min = limits.GabMin;
    const max = limits.GabMax;
    const frontZ = Math.abs(max.z) >= Math.abs(min.z) ? max.z : min.z;
    const outward = frontZ >= 0 ? 1 : -1;

    const panelX = min.x + (max.x - min.x - p.panelW) / 2;
    const panelBottom = min.y - p.overhang;
    const blockX = panelX + (p.panelW - p.blockW) / 2;
    const panelZ = outward > 0 ? frontZ : frontZ - p.panelD;
    const outerZ = frontZ + outward * p.panelD;
    const nickelZ = outward > 0 ? outerZ : outerZ - FACE_THICK;
    const bodyZ = outward > 0 ? frontZ - p.blockD : frontZ;

    const root = Block(p.model, model);
    const panelOwner = Block('Панель СВЧ', root);
    const blockOwner = Block('Блок СВЧ', root);

    Box(
        panelOwner, 'Панель СВЧ', MAT_PANEL,
        p.panelW - 1, p.panelH - 1, p.panelD,
        panelX + 0.5, panelBottom + 0.5, panelZ
    );
    NickelFrame(panelOwner, p.panelW, p.panelH, panelX, panelBottom, nickelZ);
    Controls(
        panelOwner,
        panelX + p.panelW - FACE_RIGHT / 2,
        panelBottom + 50 + KNOB_RADIUS,
        outerZ + outward * FACE_THICK,
        outward
    );

    Box(
        blockOwner, 'Блок СВЧ', MAT_BLOCK,
        p.blockW, p.blockH, p.blockD,
        blockX, min.y, bodyZ
    );

    Size(root, 'Ширина панели',
        panelX, panelBottom, outerZ,
        panelX + p.panelW, panelBottom, outerZ);
    Size(root, 'Высота панели',
        panelX, panelBottom, outerZ,
        panelX, panelBottom + p.panelH, outerZ);
    Size(root, 'Глубина блока',
        blockX, min.y, frontZ,
        blockX, min.y, frontZ - outward * p.blockD);

    try { model.UnSelectAll(); } catch (e) { /* выделение как есть */ }
    root.Selected = true;
}

function Point(pts, x, y) {
    const last = pts[pts.length - 1];
    if (last && last[0] === x && last[1] === y) return;
    pts.push([x, y]);
}

function BandsOverlap(a0, a1, b0, b1) {
    return a1 > a0 && b1 > b0 && a0 < b1 && b0 < a1;
}

function Profile(p) {
    const front = p.depth;
    const notch = p.depth - RECESS;
    const pts = [];

    Point(pts, 0, 0);
    Point(pts, 0, p.height);
    if (p.h3 > 0) {
        Point(pts, notch, p.height);
        Point(pts, notch, p.height - p.h3);
        Point(pts, front, p.height - p.h3);
    } else {
        Point(pts, front, p.height);
    }
    if (p.h2 > 0) {
        Point(pts, front, p.hd + p.h2);
        Point(pts, notch, p.hd + p.h2);
        Point(pts, notch, p.hd);
        Point(pts, front, p.hd);
    }
    if (p.h1 > 0) {
        Point(pts, front, p.h1);
        Point(pts, notch, p.h1);
        Point(pts, notch, 0);
    } else {
        Point(pts, front, 0);
    }
    Point(pts, 0, 0);

    const contour = geometry2d.NewContour();
    for (let i = 1; i < pts.length; i++) {
        contour.AddLine(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
    }
    return contour;
}

function FromLimits(limits, x, y, z) {
    return model.ObjectToObject(limits, geometry3d.VectorMake(x, y, z));
}

function FrameFront(limits) {
    const min = limits.GMin;
    const max = limits.GMax;
    const cx = (min.x + max.x) / 2;
    const atMinZ = FromLimits(limits, cx, min.y, min.z);
    const atMaxZ = FromLimits(limits, cx, min.y, max.z);
    return atMaxZ.z >= atMinZ.z ? atMaxZ : atMinZ;
}

function BuildFridge(p) {
    if (p.depth <= RECESS) throw new Error('Глубина должна быть больше выреза ' + RECESS + ' мм');

    const bands = [];
    if (p.h1 > 0) bands.push([0, p.h1, 'Отступ снизу']);
    if (p.h2 > 0) bands.push([p.hd, p.hd + p.h2, 'Зазор между дверями']);
    if (p.h3 > 0) bands.push([p.height - p.h3, p.height, 'Отступ сверху']);
    for (let i = 0; i < bands.length; i++) {
        if (bands[i][0] < 0 || bands[i][1] > p.height) {
            throw new Error(bands[i][2] + ' выходит за высоту корпуса');
        }
        for (let j = i + 1; j < bands.length; j++) {
            if (BandsOverlap(bands[i][0], bands[i][1], bands[j][0], bands[j][1])) {
                throw new Error(bands[i][2] + ' пересекается с: ' + bands[j][2]);
            }
        }
    }

    const limits = FindLimits(model);
    if (!limits) throw new Error('В модели нет габаритной рамки');
    const front = FrameFront(limits);

    const root = Block(p.model, model);
    root.Position = geometry3d.VectorMake(
        front.x - p.width / 2,
        front.y + FLOOR_GAP,
        front.z
    );
    const body = objects3d.NewExtrusionBody(p.depth, p.height, p.width, root);
    body.Contour.Clear();
    body.Contour.AddList(Profile(p), true);
    body.Thickness = p.width;
    body.Name = 'Холодильник';
    body.MaterialName = MAT_FRIDGE;
    body.RotateY(-90);
    body.Position = geometry3d.VectorMake(p.width, 0, -p.depth);
    Appliance(body);

    Size(root, 'Ширина', 0, 0, 0, p.width, 0, 0);
    Size(root, 'Высота', 0, 0, 0, 0, p.height, 0);
    Size(root, 'Глубина', 0, 0, 0, 0, 0, -p.depth);

    try { model.UnSelectAll(); } catch (e) { /* выделение как есть */ }
    root.Selected = true;
}

function BuildHood(p) {
    const limits = FindLimits(model);
    if (!limits) throw new Error('В фрагменте нет габаритной рамки');

    const min = limits.GabMin;
    const max = limits.GabMax;
    const bottom = min.y;
    const panelX = min.x + (max.x - min.x - p.panelW) / 2;
    const panelZ = min.z + (max.z - min.z - p.panelD) / 2;
    const blockX = panelX + (p.panelW - p.blockW) / 2;
    const blockZ = panelZ + (p.panelD - p.blockD) / 2;

    const root = Block(p.model, model);
    const panelOwner = Block('Панель вытяжки', root);
    const blockOwner = Block('Блок вытяжки', root);
    const pipeOwner = Block('Труба', root);

    Box(
        panelOwner, 'Панель вытяжки', MAT_HOOD_PANEL,
        p.panelW, p.panelH, p.panelD,
        panelX, bottom - p.panelH, panelZ
    );
    HoodButtons(
        panelOwner, panelX, panelZ, p.panelW, p.panelD,
        bottom - p.panelH - 1
    );
    Box(
        blockOwner, 'Блок вытяжки', MAT_HOOD,
        p.blockW, p.blockH, p.blockD,
        blockX, bottom, blockZ
    );
    VerticalPipe(
        pipeOwner, 'Труба', MAT_HOOD,
        panelX + p.panelW / 2, panelZ + p.panelD / 2,
        120, p.pipeH, bottom + p.blockH
    );

    Size(root, 'Ширина панели',
        panelX, bottom - p.panelH, panelZ,
        panelX + p.panelW, bottom - p.panelH, panelZ);
    Size(root, 'Глубина панели',
        panelX, bottom - p.panelH, panelZ,
        panelX, bottom - p.panelH, panelZ + p.panelD);
    Size(root, 'Высота блока',
        blockX, bottom, blockZ,
        blockX, bottom + p.blockH, blockZ);

    try { model.UnSelectAll(); } catch (e) { /* выделение как есть */ }
    root.Selected = true;
}

function HoodButtons(owner, panelX, panelZ, panelW, panelD, y) {
    const frontZ = Math.abs(panelZ + panelD) >= Math.abs(panelZ) ? panelZ + panelD : panelZ;
    const outward = frontZ >= 0 ? 1 : -1;
    const count = 4;
    const step = 20;
    const x0 = panelX + panelW / 2 - (count - 1) * step / 2;
    const inset = panelD > 36 ? 18 / panelD : 0.25;
    const btnZ = AlongDepth(panelZ, panelD, outward, 1 - inset);
    for (let i = 0; i < count; i++) {
        VerticalPipe(owner, 'Кнопка', MAT_HOOD_BTN, x0 + i * step, btnZ, 12, 1, y);
    }
}

function AlongDepth(panelZ, panelD, outward, tFromBack) {
    if (outward > 0) return panelZ + panelD * tFromBack;
    return panelZ + panelD * (1 - tFromBack);
}

function CookZone(owner, cx, cz, y, radius) {
    const outer = geometry2d.NewContour();
    outer.AddCircle(0, 0, radius);
    const inner = geometry2d.NewContour();
    inner.AddCircle(0, 0, radius - 4);
    const ring = geometry2d.NewContour();
    const ok = geometry2d.BooleanOperation2D(
        outer, inner, geometry2d.booleanFunction2D.subtraction, ring
    );
    if (!ok) throw new Error('Не удалось построить конфорку');

    const body = objects3d.NewExtrusionBody(1, 1, 1, owner);
    body.Orient(AxisY, Axis_Z);
    body.Contour.Clear();
    body.Contour.AddList(ring, true);
    body.Thickness = 1;
    body.Name = 'Конфорка';
    body.MaterialName = MAT_COOK_ZONE;
    body.Position = geometry3d.VectorMake(cx, y, cz);
    return Appliance(body);
}

function CookFace(owner, panelX, panelZ, panelW, panelD, outward, y) {
    const two = panelW < 400;
    const radius = two ? 68 : 78;
    const xs = two ? [0.5] : [0.30, 0.72];
    const ts = two ? [0.40, 0.70] : [0.30, 0.62];
    for (let i = 0; i < xs.length; i++) {
        for (let j = 0; j < ts.length; j++) {
            CookZone(
                owner,
                panelX + panelW * xs[i],
                AlongDepth(panelZ, panelD, outward, ts[j]),
                y,
                radius
            );
        }
    }

    const count = two ? 4 : 5;
    const step = 18;
    const btnZ = AlongDepth(panelZ, panelD, outward, 1 - 28 / panelD);
    const markZ = AlongDepth(panelZ, panelD, outward, 1 - 52 / panelD);
    for (let i = 0; i < count; i++) {
        VerticalPipe(
            owner, 'Кнопка', MAT_COOK_ZONE,
            panelX + 46 + i * step, btnZ,
            11, 1, y
        );
    }
    const markW = 62;
    const markD = 12;
    const markX = panelX + 46;
    const markZ0 = outward > 0 ? markZ - markD : markZ;
    Box(
        owner, 'Индикатор', MAT_COOK_ZONE,
        markW, 1, markD,
        markX, y, markZ0
    );
}

function BuildCook(p) {
    const limits = FindLimits(model);
    if (!limits) throw new Error('В фрагменте нет габаритной рамки');

    const min = limits.GabMin;
    const max = limits.GabMax;
    const panelY = max.y + p.topThick;
    const panelX = min.x + (max.x - min.x - p.panelW) / 2;
    const frameFront = Math.abs(max.z) >= Math.abs(min.z) ? max.z : min.z;
    const outward = frameFront >= 0 ? 1 : -1;
    const panelFront = frameFront - outward * COOK_FRONT;
    const panelZ = outward > 0 ? panelFront - p.panelD : panelFront;
    const blockX = panelX + (p.panelW - p.blockW) / 2;
    const blockZ = panelZ + (p.panelD - p.blockD) / 2;

    const root = Block(p.model, model);
    const panelOwner = Block('Панель варочная', root);
    const blockOwner = Block('Блок варочной', root);

    Box(
        panelOwner, 'Панель варочная', MAT_COOK_FACE,
        p.panelW, COOK_FACE, p.panelD,
        panelX, panelY, panelZ
    );
    CookFace(panelOwner, panelX, panelZ, p.panelW, p.panelD, outward, panelY + COOK_FACE);
    Box(
        blockOwner, 'Блок варочной', MAT_COOK_BLOCK,
        p.blockW, p.blockH, p.blockD,
        blockX, panelY - p.blockH, blockZ
    );

    Size(root, 'Ширина панели',
        panelX, panelY, panelZ,
        panelX + p.panelW, panelY, panelZ);
    Size(root, 'Глубина панели',
        panelX, panelY, panelZ,
        panelX, panelY, panelZ + p.panelD);
    Size(root, 'Высота блока',
        blockX, panelY, blockZ,
        blockX, panelY - p.blockH, blockZ);

    try { model.UnSelectAll(); } catch (e) { /* выделение как есть */ }
    root.Selected = true;
}

function Open() {
    form = UI.components.NewForm();
    form.Caption = 'Встройка';
    form.Width = 430;
    form.Height = 220;
    try { form.Position = UI.constants.formPosition.screenCenter; }
    catch (e) { /* положение по умолчанию */ }

    const lblChoose = UI.components.NewLabel(form, form);
    lblChoose.Left = 12;
    lblChoose.Top = 16;
    lblChoose.Width = 390;
    lblChoose.Height = 20;
    lblChoose.Caption = 'Выберите технику';

    const btnPickMw = Btn(form, 'СВЧ', 12, 52, 390, 36, function () { ShowParams('mw'); });
    const btnPickFr = Btn(form, 'Холодильник', 12, 100, 390, 36, function () { ShowParams('fr'); });
    const btnPickHood = Btn(form, 'Вытяжка', 12, 148, 390, 36, function () { ShowParams('hood'); });
    const btnPickCook = Btn(form, 'Варочная панель', 12, 196, 390, 36, function () { ShowParams('cook'); });

    const lblVer = UI.components.NewLabel(form, form);
    lblVer.Left = 12;
    lblVer.Top = 304;
    lblVer.Width = 120;
    lblVer.Height = 16;
    lblVer.Caption = 'Версия ' + SCRIPT_VERSION;
    try { lblVer.AutoSize = false; } catch (e) { /* ширина как задана */ }
    lblVer.Style.Font.Size = 8;

    const edRepo = UI.components.NewTextEdit(form, form);
    edRepo.Left = 12;
    edRepo.Top = 320;
    edRepo.Width = 268;
    edRepo.Height = 16;
    edRepo.Text = SCRIPT_REPO;
    edRepo.Properties.ReadOnly = true;
    edRepo.Properties.AutoSelect = true;
    const bevelNone = UI.constants.bevelCut && UI.constants.bevelCut.none;
    if (bevelNone != null) {
        edRepo.BevelInner = bevelNone;
        edRepo.BevelOuter = bevelNone;
    }
    const borderStyle = UI.constants.cxContainerBorderStyle || UI.constants.cxEditBorderStyle;
    if (borderStyle && borderStyle.none != null) edRepo.Style.BorderStyle = borderStyle.none;
    edRepo.Style.TransparentBorder = true;
    edRepo.Style.Shadow = false;
    try { edRepo.Style.Edges = []; } catch (e) { /* границы уже выключены стилем */ }
    edRepo.Style.Font.Size = 8;
    let repoBg = 15790320;
    try { if (form.Color) repoBg = form.Color; } catch (e) { /* цвет панели по умолчанию */ }
    edRepo.Style.Color = repoBg;

    const choiceOnly = [lblChoose, btnPickMw, btnPickFr, btnPickHood, btnPickCook, lblVer, edRepo];

    const btnBack = Btn(form, 'Назад', 12, 8, 70, 22, ShowChoice);

    const lblModel = UI.components.NewLabel(form, form);
    lblModel.Left = 12;
    lblModel.Top = 40;
    lblModel.Width = 70;
    lblModel.Height = 20;
    lblModel.Caption = 'Модель';

    const edModel = UI.components.NewTextEdit(form, form);
    edModel.Left = 88;
    edModel.Top = 36;
    edModel.Width = 314;
    edModel.Height = 24;
    edModel.Text = '';

    const grpPanel = UI.components.NewGroupBox(form, form);
    grpPanel.Caption = 'Панель';
    grpPanel.Left = 12;
    grpPanel.Top = 72;
    grpPanel.Width = 390;
    grpPanel.Height = 180;

    const edPanelW = Field(form, grpPanel, 28, 'Ширина', 595);
    const edPanelH = Field(form, grpPanel, 60, 'Высота', 390);
    const edPanelD = Field(form, grpPanel, 92, 'Глубина', 20);
    const edOverhang = Field(form, grpPanel, 124, 'Свес вниз от дна модуля', 5);

    const grpBlock = UI.components.NewGroupBox(form, form);
    grpBlock.Caption = 'Блок встройки';
    grpBlock.Left = 12;
    grpBlock.Top = 260;
    grpBlock.Width = 390;
    grpBlock.Height = 148;

    const edBlockW = Field(form, grpBlock, 28, 'Ширина', 555);
    const edBlockH = Field(form, grpBlock, 60, 'Высота', 365);
    const edBlockD = Field(form, grpBlock, 92, 'Глубина', 312);

    const hintMw1 = HintLine('Панель по центру передней грани рамки.', 410);
    const hintMw2 = HintLine('Корпус уходит к нулю.', 428);

    const grpBox = UI.components.NewGroupBox(form, form);
    grpBox.Caption = 'Корпус';
    grpBox.Left = 12;
    grpBox.Top = 72;
    grpBox.Width = 390;
    grpBox.Height = 148;

    const edW = Field(form, grpBox, 28, 'Ширина', 540);
    const edH = Field(form, grpBox, 60, 'Высота', 1935);
    const edD = Field(form, grpBox, 92, 'Глубина', 550);

    const grpDoor = UI.components.NewGroupBox(form, form);
    grpDoor.Caption = 'Вырезы фасада';
    grpDoor.Left = 12;
    grpDoor.Top = 228;
    grpDoor.Width = 390;
    grpDoor.Height = 180;

    const edH1 = Field(form, grpDoor, 28, 'Отступ от пола нижн. двери', 50);
    const edH2 = Field(form, grpDoor, 60, 'Зазор между дверями', 50);
    const edH3 = Field(form, grpDoor, 92, 'Отступ от верха', 50);
    const edHd = Field(form, grpDoor, 124, 'Высота от пола нижн. двери', 695);

    const hintFr1 = HintLine('По переднему краю рамки, по центру.', 410);
    const hintFr2 = HintLine('Низ на 16 мм выше дна, глубина вглубь.', 428);

    const grpHoodPanel = UI.components.NewGroupBox(form, form);
    grpHoodPanel.Caption = 'Панель';
    grpHoodPanel.Left = 12;
    grpHoodPanel.Top = 72;
    grpHoodPanel.Width = 390;
    grpHoodPanel.Height = 148;

    const edHoodW = Field(form, grpHoodPanel, 28, 'Ширина', 550);
    const edHoodD = Field(form, grpHoodPanel, 60, 'Глубина', 280);
    const edHoodH = Field(form, grpHoodPanel, 92, 'Высота', 10);

    const grpHoodBlock = UI.components.NewGroupBox(form, form);
    grpHoodBlock.Caption = 'Блок';
    grpHoodBlock.Left = 12;
    grpHoodBlock.Top = 228;
    grpHoodBlock.Width = 390;
    grpHoodBlock.Height = 180;

    const edHoodBlockW = Field(form, grpHoodBlock, 28, 'Ширина', 520);
    const edHoodBlockD = Field(form, grpHoodBlock, 60, 'Глубина', 250);
    const edHoodBlockH = Field(form, grpHoodBlock, 92, 'Высота', 320);
    const edPipeH = Field(form, grpHoodBlock, 124, 'Высота трубы', 10);

    const hintHood1 = HintLine('Панель вниз от низа рамки, по центру.', 416);
    const hintHood2 = HintLine('Блок и труба вверх.', 434);

    const grpCookPanel = UI.components.NewGroupBox(form, form);
    grpCookPanel.Caption = 'Панель';
    grpCookPanel.Left = 12;
    grpCookPanel.Top = 72;
    grpCookPanel.Width = 390;
    grpCookPanel.Height = 148;

    const edCookW = Field(form, grpCookPanel, 28, 'Ширина', 590);
    const edCookD = Field(form, grpCookPanel, 60, 'Глубина', 515);
    const rbTop = TopRadios(form, grpCookPanel, 92);

    const grpCookBlock = UI.components.NewGroupBox(form, form);
    grpCookBlock.Caption = 'Блок';
    grpCookBlock.Left = 12;
    grpCookBlock.Top = 228;
    grpCookBlock.Width = 390;
    grpCookBlock.Height = 148;

    const edCookBlockW = Field(form, grpCookBlock, 28, 'Ширина', 555);
    const edCookBlockD = Field(form, grpCookBlock, 60, 'Глубина', 480);
    const edCookBlockH = Field(form, grpCookBlock, 92, 'Высота', 50);

    const hintCook1 = HintLine('Лицевая 5 мм над верхом рамки и столешницей.', 392);
    const hintCook2 = HintLine('Блок от панели вниз, по центру.', 410);

    const btnCreate = Btn(form, 'Создать', 12, 456, 190, 32, function () {
        let modelName = ReadModel(edModel);
        if (modelName === '') {
            if (kind === 'mw') modelName = 'СВЧ';
            else if (kind === 'fr') modelName = 'Холодильник';
            else if (kind === 'hood') modelName = 'Вытяжка';
            else modelName = 'Варочная панель';
        }
        if (kind === 'mw') {
            BuildMicrowave({
                model: modelName,
                panelW: ReadNum(edPanelW, 'Ширина панели', false),
                panelH: ReadNum(edPanelH, 'Высота панели', false),
                panelD: ReadNum(edPanelD, 'Глубина панели', false),
                overhang: ReadNum(edOverhang, 'Свес панели', true),
                blockW: ReadNum(edBlockW, 'Ширина блока', false),
                blockH: ReadNum(edBlockH, 'Высота блока', false),
                blockD: ReadNum(edBlockD, 'Глубина блока', false)
            });
        } else if (kind === 'fr') {
            BuildFridge({
                model: modelName,
                width: ReadNum(edW, 'Ширина', false),
                height: ReadNum(edH, 'Высота', false),
                depth: ReadNum(edD, 'Глубина', false),
                h1: ReadNum(edH1, 'Отступ от пола нижн. двери', true),
                h2: ReadNum(edH2, 'Зазор между дверями', true),
                h3: ReadNum(edH3, 'Отступ от верха', true),
                hd: ReadNum(edHd, 'Высота от пола нижн. двери', true)
            });
        } else if (kind === 'hood') {
            BuildHood({
                model: modelName,
                panelW: ReadNum(edHoodW, 'Ширина панели', false),
                panelD: ReadNum(edHoodD, 'Глубина панели', false),
                panelH: ReadNum(edHoodH, 'Высота панели', false),
                blockW: ReadNum(edHoodBlockW, 'Ширина блока', false),
                blockD: ReadNum(edHoodBlockD, 'Глубина блока', false),
                blockH: ReadNum(edHoodBlockH, 'Высота блока', false),
                pipeH: ReadNum(edPipeH, 'Высота трубы', false)
            });
        } else {
            BuildCook({
                model: modelName,
                panelW: ReadNum(edCookW, 'Ширина панели', false),
                panelD: ReadNum(edCookD, 'Глубина панели', false),
                topThick: ReadTop(rbTop),
                blockW: ReadNum(edCookBlockW, 'Ширина блока', false),
                blockD: ReadNum(edCookBlockD, 'Глубина блока', false),
                blockH: ReadNum(edCookBlockH, 'Высота блока', false)
            });
        }
        CloseForm();
    });
    const btnClose = Btn(form, 'Закрыть', 214, 456, 188, 32, CloseForm);

    const mwOnly = [grpPanel, grpBlock, hintMw1, hintMw2];
    const frOnly = [grpBox, grpDoor, hintFr1, hintFr2];
    const hoodOnly = [grpHoodPanel, grpHoodBlock, hintHood1, hintHood2];
    const cookOnly = [grpCookPanel, grpCookBlock, hintCook1, hintCook2];
    const paramOnly = [btnBack, lblModel, edModel, btnCreate, btnClose];

    function ShowChoice() {
        kind = '';
        form.Caption = 'Встройка';
        form.Height = 380;
        Show(choiceOnly, true);
        Show(paramOnly, false);
        Show(mwOnly, false);
        Show(frOnly, false);
        Show(hoodOnly, false);
        Show(cookOnly, false);
    }

    function ShowParams(next) {
        kind = next;
        if (next === 'mw') form.Caption = 'Встройка — СВЧ';
        else if (next === 'fr') form.Caption = 'Встройка — Холодильник';
        else if (next === 'hood') form.Caption = 'Встройка — Вытяжка';
        else form.Caption = 'Встройка — Варочная панель';
        form.Height = 542;
        Show(choiceOnly, false);
        Show(paramOnly, true);
        Show(mwOnly, next === 'mw');
        Show(frOnly, next === 'fr');
        Show(hoodOnly, next === 'hood');
        Show(cookOnly, next === 'cook');
    }

    ShowChoice();
    form.OnClose = function () { CloseForm(); };
    execution.ContinueExecution();
    form.Show();
}

try {
    Open();
} catch (e) {
    Fail(e);
}
