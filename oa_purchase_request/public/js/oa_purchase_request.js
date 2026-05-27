frappe.ui.form.on("OA Purchase Request", {
	refresh(frm) {
		frm.__show_empty_fields = frm.__show_empty_fields || false;
		hide_legacy_fields(frm);
		set_empty_fields_visibility(frm, frm.__show_empty_fields);

		frm.add_custom_button(__(frm.__show_empty_fields ? "隐藏空字段" : "显示空字段"), () => {
			frm.__show_empty_fields = !frm.__show_empty_fields;
			hide_legacy_fields(frm);
			set_empty_fields_visibility(frm, frm.__show_empty_fields);
			frm.refresh();
		});
	},
});

const LEGACY_FIELDS = [
	"attachments_json",
	"approval_history",
	"approval_status",
	"currency",
	"created_time",
	"creator",
	"creator_department",
	"form_name",
	"items_json",
	"odt",
	"oa_code",
	"payee",
	"payment_amount",
	"payment_date",
	"payment_terms",
	"payments_json",
	"processing_materials",
	"process_code",
	"process_instance_id",
	"processor_name",
	"processor_phone",
	"processor_qty",
	"processor_total_amount",
	"processor_unit_price",
	"processors_json",
	"raw_payload",
	"sales_order_no",
];

function hide_legacy_fields(frm) {
	for (const fieldname of LEGACY_FIELDS) {
		if (frm.fields_dict[fieldname]) {
			frm.set_df_property(fieldname, "hidden", 1);
		}
	}
}

function set_empty_fields_visibility(frm, show_empty_fields) {
	for (const field of frm.meta.fields || []) {
		if (!can_toggle_field(field)) {
			continue;
		}

		frm.set_df_property(field.fieldname, "hidden", !show_empty_fields && is_empty_value(frm.doc[field.fieldname]));
	}
}

function can_toggle_field(field) {
	const layout_fields = ["Section Break", "Column Break", "Tab Break", "HTML", "Button"];

	return field.fieldname && !layout_fields.includes(field.fieldtype) && !LEGACY_FIELDS.includes(field.fieldname);
}

function is_empty_value(value) {
	if (value === undefined || value === null || value === "") {
		return true;
	}

	if (Array.isArray(value)) {
		return value.length === 0;
	}

	return false;
}
